import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getClock } from '@/lib/time/clock';

/**
 * Processes a data_deletion_requests row.
 * Only runs when `scheduled_at <= now`. Idempotent.
 *
 * Strategy: prefers anonymization over hard delete to preserve financial +
 * audit trails required by law. Actual removal only for scope='case'.
 */
export async function processDeletionRequest(requestId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: req } = await admin
    .from('data_deletion_requests')
    .select('id, organization_id, scope, scope_id, status, scheduled_at, cancelled_at')
    .eq('id', requestId)
    .maybeSingle<{
      id: string;
      organization_id: string;
      scope: 'organization' | 'user' | 'case';
      scope_id: string | null;
      status: string;
      scheduled_at: string | null;
      cancelled_at: string | null;
    }>();
  if (!req) throw new Error('deletion request not found');
  if (req.status !== 'pending') return;
  if (req.cancelled_at) return;
  const clock = getClock();
  if (req.scheduled_at && new Date(req.scheduled_at).getTime() > clock.nowMs()) return;

  await admin.from('data_deletion_requests').update({ status: 'processing' }).eq('id', req.id);

  try {
    switch (req.scope) {
      case 'organization':
        await anonymizeOrganization(admin, req.organization_id);
        break;
      case 'user':
        if (req.scope_id) await anonymizeUser(admin, req.scope_id);
        break;
      case 'case':
        if (req.scope_id) await deleteCaseData(admin, req.scope_id);
        break;
    }

    await admin.from('data_deletion_requests').update({
      status: 'completed',
      executed_at: clock.now().toISOString()
    }).eq('id', req.id);
  } catch (err) {
    await admin.from('data_deletion_requests').update({
      status: 'failed',
      executed_at: clock.now().toISOString()
    }).eq('id', req.id);
    throw err;
  }
}

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

async function anonymizeOrganization(admin: AdminClient, orgId: string) {
  // Soft-delete the org. Financial + audit rows are preserved.
  await admin.from('organizations').update({
    name: `[DELETED-${orgId.slice(0, 8)}]`,
    legal_name: null,
    document: null,
    email: null,
    phone: null,
    whatsapp: null,
    address: null,
    logo_url: null,
    deleted_at: getClock().now().toISOString(),
    subscription_status: 'cancelled'
  }).eq('id', orgId);

  // Anonymize all users of the org
  const { data: users } = await admin.from('profiles').select('id').eq('organization_id', orgId);
  for (const u of users ?? []) {
    await anonymizeUser(admin, (u as { id: string }).id);
  }
}

async function anonymizeUser(admin: AdminClient, userId: string) {
  const stub = `deleted_${userId.slice(0, 8)}@anonymized.local`;
  await admin.from('profiles').update({
    email: stub,
    full_name: `[DELETED-${userId.slice(0, 8)}]`,
    avatar_url: null,
    status: 'archived'
  }).eq('id', userId);

  // Revoke sessions (admin API)
  try {
    await admin.auth.admin.updateUserById(userId, {
      email: stub,
      user_metadata: { deleted: true },
      ban_duration: '87600h' // 10 years — effectively lock
    });
  } catch {
    // best-effort
  }

  await admin.from('security_events').insert({
    user_id: userId,
    event_type: 'user_anonymized',
    metadata: { by_lgpd: true }
  });
}

async function deleteCaseData(admin: AdminClient, caseId: string) {
  // Case cascade covers most tables (checklist, files, messages, quotes, planning, deliveries).
  // We keep audit records because they may be legally required.
  await admin.from('cases').delete().eq('id', caseId);
}
