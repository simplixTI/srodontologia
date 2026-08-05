import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Gradual dunning cycle for past-due tenants.
 *
 *   Day 0-2:  status=past_due, notify only
 *   Day 3-6:  banner + block non-essential automations
 *   Day 7-14: block new case creation
 *   Day 15-29: readonly mode
 *   Day 30+:  suspended
 *
 * Never deletes data automatically. Idempotent — safe to run every hour.
 */
export async function runDunningTick(): Promise<{ scanned: number; upgraded: number }> {
  const admin = createSupabaseAdminClient();
  const now = Date.now();

  const { data: orgs } = await admin
    .from('organizations')
    .select('id, subscription_status, dunning_stage, dunning_last_event_at')
    .eq('subscription_status', 'past_due')
    .is('deleted_at', null);

  let upgraded = 0;
  for (const org of orgs ?? []) {
    const ref = org.dunning_last_event_at
      ? new Date(org.dunning_last_event_at).getTime()
      : now;
    const days = Math.floor((now - ref) / 86_400_000);

    const targetStage =
      days >= 30 ? 5 :
      days >= 15 ? 4 :
      days >= 7 ? 3 :
      days >= 3 ? 2 :
      1;

    if (targetStage <= (org.dunning_stage ?? 0)) continue;

    await admin.from('organizations').update({ dunning_stage: targetStage }).eq('id', org.id);

    // Stage 5 → suspend
    if (targetStage === 5) {
      await admin.from('organizations').update({
        subscription_status: 'suspended',
        suspended_at: new Date().toISOString(),
        suspended_reason: 'dunning:30d_unpaid'
      }).eq('id', org.id);
    }

    await admin.from('operational_alerts').insert({
      organization_id: org.id,
      source: 'billing',
      severity: targetStage >= 4 ? 'error' : 'warning',
      title: `Dunning stage ${targetStage}`,
      message: `Tenant em atraso há ${days} dia(s). Aplicando restrições stage ${targetStage}.`,
      metadata: { stage: targetStage, days }
    });

    upgraded++;
  }
  return { scanned: (orgs ?? []).length, upgraded };
}

/**
 * Returns the write-permission decision for a tenant based on dunning stage.
 * Called from server actions that create resources.
 */
export type WriteAllowance = {
  allowed: boolean;
  reason?: 'suspended' | 'readonly_dunning' | 'blocked_dunning';
  stage?: number;
};

export async function evaluateWriteAllowance(organizationId: string): Promise<WriteAllowance> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('organizations')
    .select('subscription_status, dunning_stage')
    .eq('id', organizationId)
    .maybeSingle<{ subscription_status: string; dunning_stage: number }>();
  if (!data) return { allowed: true };
  if (data.subscription_status === 'suspended' || data.subscription_status === 'cancelled') {
    return { allowed: false, reason: 'suspended', stage: data.dunning_stage };
  }
  if (data.dunning_stage >= 4) return { allowed: false, reason: 'readonly_dunning', stage: data.dunning_stage };
  if (data.dunning_stage >= 3) return { allowed: false, reason: 'blocked_dunning', stage: data.dunning_stage };
  return { allowed: true, stage: data.dunning_stage };
}
