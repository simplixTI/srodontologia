import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { JobProcessor } from '../types';
import { executeAutomationAction, type AutomationAction } from '@/lib/automation/actions';

type AutomationRunPayload = {
  rule_id: string;
  event_id: string;
  action: AutomationAction;
};

export const processAutomationRun: JobProcessor<AutomationRunPayload> = async (job) => {
  const admin = createSupabaseAdminClient();
  const { rule_id, event_id, action } = job.payload;
  if (!rule_id || !event_id || !action) throw new Error('automation_run payload invalid');

  const { data: event } = await admin
    .from('domain_events')
    .select('id, organization_id, event_type, aggregate_type, aggregate_id, payload')
    .eq('id', event_id)
    .maybeSingle();
  if (!event) return { skipped: 'event_not_found' };

  const result = await executeAutomationAction({
    organizationId: event.organization_id,
    event: {
      id: event.id,
      organizationId: event.organization_id,
      type: event.event_type,
      aggregateType: event.aggregate_type,
      aggregateId: event.aggregate_id,
      payload: event.payload ?? {}
    } as never,
    action
  });

  await admin
    .from('automation_rules')
    .update({
      runs_count: undefined,
      last_run_at: new Date().toISOString()
    })
    .eq('id', rule_id);

  return { ok: true, ...result };
};
