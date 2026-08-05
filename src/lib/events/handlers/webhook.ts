import 'server-only';
import { registerEventHandler } from '../bus';
import { enqueueWebhookDeliveries } from '@/lib/webhooks/dispatcher';

/**
 * On every event, checks configured webhooks for the org that subscribe to
 * this event type and enqueues delivery jobs.
 */
export function registerWebhookHandler(): void {
  registerEventHandler('.*' as `${string}.*`, async (event) => {
    if (!event.id) return;
    await enqueueWebhookDeliveries(event);
  }, 'webhookDispatch');
}
