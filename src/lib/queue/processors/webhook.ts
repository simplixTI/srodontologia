import 'server-only';
import { createHmac } from 'crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { JobProcessor } from '../types';

type WebhookPayload = {
  delivery_id: string;
};

export const processWebhookDeliver: JobProcessor<WebhookPayload> = async (job) => {
  const admin = createSupabaseAdminClient();
  const deliveryId = job.payload.delivery_id;
  if (!deliveryId) throw new Error('webhook_deliver missing delivery_id');

  const { data: delivery } = await admin
    .from('webhook_deliveries')
    .select('id, webhook_id, event_type, request_body, attempts, organization_id')
    .eq('id', deliveryId)
    .maybeSingle();
  if (!delivery) throw new Error('delivery not found');

  const { data: webhook } = await admin
    .from('webhooks')
    .select('id, url, secret, enabled')
    .eq('id', delivery.webhook_id)
    .maybeSingle();
  if (!webhook || !webhook.enabled) {
    await admin.from('webhook_deliveries').update({
      status: 'failed',
      delivered_at: new Date().toISOString()
    }).eq('id', delivery.id);
    return { skipped: true };
  }

  const body = JSON.stringify(delivery.request_body ?? {});
  const signature = createHmac('sha256', webhook.secret).update(body).digest('hex');

  const started = Date.now();
  let status = 0;
  let responseBody = '';
  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SR-Event': delivery.event_type,
        'X-SR-Signature': signature,
        'X-SR-Delivery': delivery.id
      },
      body,
      signal: AbortSignal.timeout(15_000)
    });
    status = res.status;
    responseBody = (await res.text().catch(() => '')).slice(0, 4000);
  } catch (err) {
    responseBody = err instanceof Error ? err.message : 'network error';
  }

  const ok = status >= 200 && status < 300;
  const attempts = (delivery.attempts ?? 0) + 1;

  await admin.from('webhook_deliveries').update({
    status: ok ? 'delivered' : attempts >= 5 ? 'exhausted' : 'pending',
    response_status: status || null,
    response_body: responseBody,
    attempts,
    delivered_at: ok ? new Date().toISOString() : null,
    next_retry_at: ok ? null : new Date(Date.now() + attempts * 60_000).toISOString()
  }).eq('id', delivery.id);

  return { ok, status, latencyMs: Date.now() - started };
};
