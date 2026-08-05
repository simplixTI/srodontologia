import 'server-only';

/**
 * Thin wrapper around Stripe REST API using raw fetch — no SDK dependency.
 * Kept intentionally minimal: only the operations we actually use.
 */

const STRIPE_BASE = 'https://api.stripe.com/v1';

function requireKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY missing');
  return key;
}

async function stripe<T>(
  path: string,
  init: { method: 'GET' | 'POST' | 'DELETE'; body?: URLSearchParams; idempotencyKey?: string }
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${requireKey()}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  if (init.idempotencyKey) headers['Idempotency-Key'] = init.idempotencyKey;

  const res = await fetch(`${STRIPE_BASE}${path}`, {
    method: init.method,
    headers,
    body: init.body?.toString()
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Stripe ${init.method} ${path} → ${res.status}: ${errBody.slice(0, 500)}`);
  }
  return (await res.json()) as T;
}

export type StripeCustomer = { id: string; email: string | null };
export type StripeSubscription = {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  items: { data: { price: { id: string } }[] };
};
export type StripeInvoice = {
  id: string;
  status: string;
  amount_paid: number;
  amount_due: number;
  currency: string;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  period_start: number;
  period_end: number;
};

export async function createOrRetrieveCustomer(input: {
  email: string;
  name?: string;
  metadata: Record<string, string>;
  existingId?: string | null;
}): Promise<StripeCustomer> {
  if (input.existingId) {
    try {
      return await stripe<StripeCustomer>(`/customers/${input.existingId}`, { method: 'GET' });
    } catch {
      // fallthrough → create new
    }
  }
  const body = new URLSearchParams();
  body.set('email', input.email);
  if (input.name) body.set('name', input.name);
  for (const [k, v] of Object.entries(input.metadata)) body.set(`metadata[${k}]`, v);
  return stripe<StripeCustomer>('/customers', {
    method: 'POST',
    body,
    idempotencyKey: `cust:${input.metadata.organization_id}`
  });
}

export async function createCheckoutSession(input: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  organizationId: string;
  planCode: string;
  cycle: 'monthly' | 'yearly';
  trialDays?: number;
}): Promise<{ id: string; url: string }> {
  const body = new URLSearchParams();
  body.set('mode', 'subscription');
  body.set('customer', input.customerId);
  body.set('success_url', input.successUrl);
  body.set('cancel_url', input.cancelUrl);
  body.set('line_items[0][price]', input.priceId);
  body.set('line_items[0][quantity]', '1');
  body.set('metadata[organization_id]', input.organizationId);
  body.set('metadata[plan_code]', input.planCode);
  body.set('metadata[cycle]', input.cycle);
  body.set('subscription_data[metadata][organization_id]', input.organizationId);
  body.set('subscription_data[metadata][plan_code]', input.planCode);
  body.set('subscription_data[metadata][cycle]', input.cycle);
  if (input.trialDays && input.trialDays > 0) {
    body.set('subscription_data[trial_period_days]', String(input.trialDays));
  }
  body.set('allow_promotion_codes', 'true');
  body.set('automatic_tax[enabled]', 'true');
  return stripe<{ id: string; url: string }>('/checkout/sessions', {
    method: 'POST',
    body,
    idempotencyKey: `checkout:${input.organizationId}:${input.priceId}:${Date.now()}`
  });
}

export async function createPortalSession(input: {
  customerId: string;
  returnUrl: string;
}): Promise<{ id: string; url: string }> {
  const body = new URLSearchParams();
  body.set('customer', input.customerId);
  body.set('return_url', input.returnUrl);
  return stripe<{ id: string; url: string }>('/billing_portal/sessions', {
    method: 'POST',
    body
  });
}

export async function updateSubscription(input: {
  subscriptionId: string;
  priceId: string;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
}): Promise<StripeSubscription> {
  // Need to fetch current item id first
  const current = await stripe<StripeSubscription>(`/subscriptions/${input.subscriptionId}`, { method: 'GET' });
  const currentItemId = (current as unknown as { items: { data: { id: string }[] } }).items.data[0]?.id;

  const body = new URLSearchParams();
  if (currentItemId) {
    body.set('items[0][id]', currentItemId);
    body.set('items[0][price]', input.priceId);
  }
  body.set('proration_behavior', input.prorationBehavior ?? 'create_prorations');
  return stripe<StripeSubscription>(`/subscriptions/${input.subscriptionId}`, {
    method: 'POST',
    body,
    idempotencyKey: `subup:${input.subscriptionId}:${input.priceId}`
  });
}

export async function cancelSubscription(input: {
  subscriptionId: string;
  atPeriodEnd: boolean;
}): Promise<StripeSubscription> {
  if (input.atPeriodEnd) {
    const body = new URLSearchParams();
    body.set('cancel_at_period_end', 'true');
    return stripe<StripeSubscription>(`/subscriptions/${input.subscriptionId}`, { method: 'POST', body });
  }
  return stripe<StripeSubscription>(`/subscriptions/${input.subscriptionId}`, { method: 'DELETE' });
}
