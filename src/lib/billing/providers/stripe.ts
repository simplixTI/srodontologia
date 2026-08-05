import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import type { BillingProvider, WebhookEvent } from '../types';

/**
 * Stripe adapter using raw fetch (no SDK). Requires:
 *   STRIPE_SECRET_KEY (env)
 *   STRIPE_WEBHOOK_SECRET (env, for parseWebhook)
 *   For each plan: metadata.plan_code + stripe price id already provisioned
 */
export function createStripeBillingProvider(): BillingProvider {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  return {
    id: 'stripe',
    displayName: 'Stripe',
    async createCheckout(input) {
      if (!apiKey) throw new Error('Stripe not configured');
      const priceEnvKey = `STRIPE_PRICE_${input.planCode.toUpperCase()}_${input.cycle.toUpperCase()}`;
      const priceId = process.env[priceEnvKey];
      if (!priceId) throw new Error(`Missing env ${priceEnvKey}`);

      const params = new URLSearchParams();
      params.set('mode', 'subscription');
      params.set('success_url', input.successUrl);
      params.set('cancel_url', input.cancelUrl);
      params.set('line_items[0][price]', priceId);
      params.set('line_items[0][quantity]', '1');
      params.set('metadata[organization_id]', input.organizationId);
      params.set('metadata[plan_code]', input.planCode);
      params.set('metadata[cycle]', input.cycle);
      if (input.customerEmail) params.set('customer_email', input.customerEmail);

      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      if (!res.ok) throw new Error(`Stripe checkout error ${res.status}`);
      const data = (await res.json()) as { id: string; url: string };
      return { provider: 'stripe', externalRef: data.id, hostedUrl: data.url };
    },

    async parseWebhook(payload): Promise<WebhookEvent> {
      if (!webhookSecret) return { type: 'ignored', reason: 'webhook secret not configured' };
      if (!verifyStripeSignature(payload, webhookSecret)) {
        throw new Error('invalid_stripe_signature');
      }
      const event = JSON.parse(payload.rawBody) as {
        type: string;
        data: { object: Record<string, unknown> };
      };

      switch (event.type) {
        case 'checkout.session.completed': {
          const obj = event.data.object as {
            metadata?: { organization_id?: string; plan_code?: string; cycle?: string };
            id?: string;
          };
          if (!obj.metadata?.organization_id || !obj.metadata.plan_code) {
            return { type: 'ignored', reason: 'metadata missing' };
          }
          return {
            type: 'checkout.completed',
            organizationId: obj.metadata.organization_id,
            planCode: obj.metadata.plan_code,
            cycle: (obj.metadata.cycle as 'monthly' | 'yearly') ?? 'monthly',
            externalRef: obj.id ?? ''
          };
        }
        case 'invoice.paid': {
          const obj = event.data.object as {
            subscription_details?: { metadata?: { organization_id?: string } };
            id?: string;
            amount_paid?: number;
          };
          const org = obj.subscription_details?.metadata?.organization_id;
          if (!org || !obj.id) return { type: 'ignored', reason: 'no org' };
          return {
            type: 'invoice.paid',
            organizationId: org,
            invoiceExternalRef: obj.id,
            amount: (obj.amount_paid ?? 0) / 100
          };
        }
        case 'invoice.payment_failed': {
          const obj = event.data.object as {
            subscription_details?: { metadata?: { organization_id?: string } };
            id?: string;
          };
          const org = obj.subscription_details?.metadata?.organization_id;
          if (!org || !obj.id) return { type: 'ignored', reason: 'no org' };
          return { type: 'invoice.payment_failed', organizationId: org, invoiceExternalRef: obj.id };
        }
        case 'customer.subscription.deleted': {
          const obj = event.data.object as { metadata?: { organization_id?: string }; id?: string };
          const org = obj.metadata?.organization_id;
          if (!org || !obj.id) return { type: 'ignored', reason: 'no org' };
          return { type: 'subscription.cancelled', organizationId: org, externalRef: obj.id };
        }
        default:
          return { type: 'ignored', reason: event.type };
      }
    },

    async cancelSubscription(externalRef) {
      if (!apiKey) throw new Error('Stripe not configured');
      await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(externalRef)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiKey}` }
      });
    }
  };
}

function verifyStripeSignature(
  payload: { headers: Record<string, string>; rawBody: string },
  secret: string
): boolean {
  const header = payload.headers['stripe-signature'] || payload.headers['Stripe-Signature'];
  if (!header) return false;

  const parts = header.split(',').reduce<Record<string, string>>((acc, p) => {
    const [k, v] = p.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});
  if (!parts.t || !parts.v1) return false;

  const signedPayload = `${parts.t}.${payload.rawBody}`;
  const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
  } catch {
    return false;
  }
}
