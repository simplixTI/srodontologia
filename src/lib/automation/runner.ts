import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { enqueueJob } from '@/lib/queue/enqueue';
import { evaluateConditions, type AutomationCondition } from './conditions';
import type { AutomationAction } from './actions';
import type { DomainEvent } from '@/lib/events/types';

/**
 * Loads active automation rules for an event and enqueues their actions.
 *
 * Never executes actions inline — everything goes through the queue so
 * failures are retried and observable. Called by the event bus handler.
 */
export async function runAutomationRules(event: DomainEvent): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: rules } = await admin
    .from('automation_rules')
    .select('id, name, conditions, actions, enabled, priority')
    .eq('organization_id', event.organizationId)
    .eq('trigger_event', event.type)
    .eq('enabled', true)
    .order('priority');

  if (!rules || rules.length === 0) return;

  const eventId = event.id;
  if (!eventId) return;

  for (const rule of rules) {
    const conditions = (rule.conditions ?? []) as AutomationCondition[];
    if (!evaluateConditions(conditions, event)) continue;

    const actions = (rule.actions ?? []) as AutomationAction[];
    for (const action of actions) {
      await enqueueJob({
        organizationId: event.organizationId,
        kind: 'automation_run',
        payload: { rule_id: rule.id, event_id: eventId, action }
      });
    }

    await admin
      .from('automation_rules')
      .update({ last_run_at: new Date().toISOString() })
      .eq('id', rule.id);
  }
}
