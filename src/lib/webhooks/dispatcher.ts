import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { enqueueJob } from '@/lib/queue/enqueue';
import type { DomainEvent } from '@/lib/events/types';

/**
 * For every enabled webhook in this org that subscribes to the event type,
 * inserts a webhook_deliveries row and enqueues its delivery job.
 */
export async function enqueueWebhookDeliveries(event: DomainEvent): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: hooks } = await admin
    .from('webhooks')
    .select('id, events, enabled')
    .eq('organization_id', event.organizationId)
    .eq('enabled', true);

  if (!hooks || hooks.length === 0) return;
  const matching = hooks.filter((h) => Array.isArray(h.events) && h.events.includes(event.type));
  if (matching.length === 0) return;

  const body = {
    id: event.id,
    type: event.type,
    aggregate: { type: event.aggregateType, id: event.aggregateId },
    payload: event.payload,
    occurred_at: event.occurredAt ?? new Date().toISOString()
  };

  for (const hook of matching) {
    const { data: delivery } = await admin
      .from('webhook_deliveries')
      .insert({
        webhook_id: hook.id,
        organization_id: event.organizationId,
        event_id: event.id ?? null,
        event_type: event.type,
        request_body: body,
        status: 'pending'
      })
      .select('id')
      .single();
    if (!delivery) continue;
    await enqueueJob({
      organizationId: event.organizationId,
      kind: 'webhook_deliver',
      payload: { delivery_id: delivery.id },
      priority: 6
    });
  }
}
