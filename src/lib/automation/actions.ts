import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { DomainEvent } from '@/lib/events/types';
import { enqueueJob } from '@/lib/queue/enqueue';
import type { JobKind } from '@/lib/queue/types';

/**
 * Catalog of automation actions.
 *
 * Each action is a small, side-effect-only step that runs asynchronously
 * (via the job queue) so failures do not block the event bus. Handlers
 * should be idempotent — the automation runner may retry on transient errors.
 */
export type AutomationAction = {
  type:
    | 'notify_admins'
    | 'notify_case_owner'
    | 'send_email'
    | 'send_whatsapp'
    | 'enqueue_webhook'
    | 'update_case_status'
    | 'enqueue_pdf'
    | 'enqueue_summary'
    | 'log_only';
  params?: Record<string, unknown>;
};

export type ExecuteInput = {
  organizationId: string;
  event: DomainEvent;
  action: AutomationAction;
};

export async function executeAutomationAction(input: ExecuteInput): Promise<Record<string, unknown>> {
  const { organizationId, event, action } = input;
  switch (action.type) {
    case 'notify_admins':
      return notifyAdmins(organizationId, event, action.params);
    case 'notify_case_owner':
      return notifyCaseOwner(organizationId, event, action.params);
    case 'send_email':
      return enqueue(organizationId, 'email_send', {
        to: action.params?.to,
        subject: action.params?.subject ?? `[SR Digital] ${event.type}`,
        text: action.params?.text ?? JSON.stringify(event.payload).slice(0, 500)
      });
    case 'send_whatsapp':
      return enqueue(organizationId, 'whatsapp_send', {
        to: action.params?.to,
        message: action.params?.message ?? `Evento ${event.type}`
      });
    case 'enqueue_webhook':
      return enqueue(organizationId, 'webhook_deliver', {
        delivery_id: action.params?.delivery_id
      });
    case 'update_case_status':
      return updateCaseStatus(organizationId, event, action.params);
    case 'enqueue_pdf':
      return enqueue(
        organizationId,
        (action.params?.kind as JobKind) ?? 'pdf_generate_case_report',
        action.params ?? {}
      );
    case 'enqueue_summary':
      if (!event.aggregateType.includes('case')) return { skipped: 'not a case event' };
      return enqueue(organizationId, 'ai_case_summary', { case_id: event.aggregateId });
    case 'log_only':
      return { logged: true, event: event.type };
    default:
      return { skipped: 'unknown action' };
  }
}

async function notifyAdmins(
  organizationId: string,
  event: DomainEvent,
  params?: Record<string, unknown>
) {
  const admin = createSupabaseAdminClient();
  await admin.rpc('notify_org_admins', {
    p_org_id: organizationId,
    p_type: (params?.type as string) ?? 'automation',
    p_title: (params?.title as string) ?? `Evento: ${event.type}`,
    p_message: (params?.message as string) ?? '',
    p_action_url: (params?.action_url as string) ?? null,
    p_case_id: event.aggregateType === 'case' ? event.aggregateId : null
  });
  return { notified: 'admins' };
}

async function notifyCaseOwner(
  organizationId: string,
  event: DomainEvent,
  params?: Record<string, unknown>
) {
  if (event.aggregateType !== 'case') return { skipped: 'not case' };
  const admin = createSupabaseAdminClient();
  const { data: c } = await admin
    .from('cases')
    .select('id, dentist_id')
    .eq('id', event.aggregateId)
    .maybeSingle();
  if (!c?.dentist_id) return { skipped: 'no dentist' };
  const { data: d } = await admin
    .from('dentists')
    .select('profile_id')
    .eq('id', c.dentist_id)
    .maybeSingle();
  if (!d?.profile_id) return { skipped: 'no profile' };

  await admin.rpc('notify_user', {
    p_org_id: organizationId,
    p_user_id: d.profile_id,
    p_type: (params?.type as string) ?? 'automation',
    p_title: (params?.title as string) ?? `Atualização no seu caso`,
    p_message: (params?.message as string) ?? '',
    p_action_url: (params?.action_url as string) ?? `/portal/casos/${c.id}`,
    p_case_id: c.id
  });
  return { notified: 'owner' };
}

async function updateCaseStatus(
  organizationId: string,
  event: DomainEvent,
  params?: Record<string, unknown>
) {
  if (event.aggregateType !== 'case') return { skipped: 'not case' };
  const admin = createSupabaseAdminClient();
  const patch: Record<string, unknown> = {};
  if (params?.internal_status) patch.internal_status = params.internal_status;
  if (params?.public_status) patch.public_status = params.public_status;
  if (Object.keys(patch).length === 0) return { skipped: 'nothing to update' };
  await admin.from('cases').update(patch).eq('id', event.aggregateId).eq('organization_id', organizationId);
  return { updated: patch };
}

async function enqueue(
  organizationId: string,
  kind: JobKind,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const job = await enqueueJob({ organizationId, kind, payload });
  return { enqueued: !!job, job_id: job?.id ?? null };
}
