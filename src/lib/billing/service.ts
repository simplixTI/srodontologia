import 'server-only';
import { createHash } from 'crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  createOrRetrieveCustomer,
  createCheckoutSession as stripeCheckout,
  createPortalSession as stripePortal,
  updateSubscription as stripeUpdate,
  cancelSubscription as stripeCancel
} from './stripe-client';

const isStripeConfigured = () => !!process.env.STRIPE_SECRET_KEY;

/**
 * Resolves the price id for a plan+cycle. First the DB column
 * (plans.stripe_price_id_monthly/yearly), falling back to env vars
 * `STRIPE_PRICE_{CODE}_{CYCLE}`.
 */
export async function resolvePriceId(planCode: string, cycle: 'monthly' | 'yearly'): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('plans')
    .select('stripe_price_id_monthly, stripe_price_id_yearly')
    .eq('code', planCode)
    .maybeSingle<{ stripe_price_id_monthly: string | null; stripe_price_id_yearly: string | null }>();
  if (data) {
    const dbVal = cycle === 'monthly' ? data.stripe_price_id_monthly : data.stripe_price_id_yearly;
    if (dbVal) return dbVal;
  }
  const envKey = `STRIPE_PRICE_${planCode.toUpperCase()}_${cycle.toUpperCase()}`;
  return process.env[envKey] ?? null;
}

/**
 * Ensures a Stripe customer exists for the org and caches its id.
 */
export async function ensureCustomer(organizationId: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data: org } = await admin
    .from('organizations')
    .select('name, email, stripe_customer_id')
    .eq('id', organizationId)
    .maybeSingle<{ name: string; email: string | null; stripe_customer_id: string | null }>();
  if (!org) throw new Error('org not found');
  if (org.stripe_customer_id) return org.stripe_customer_id;
  if (!isStripeConfigured()) throw new Error('Stripe not configured');
  if (!org.email) throw new Error('org has no billing email');

  const customer = await createOrRetrieveCustomer({
    email: org.email,
    name: org.name,
    metadata: { organization_id: organizationId }
  });
  await admin.from('organizations').update({ stripe_customer_id: customer.id }).eq('id', organizationId);
  return customer.id;
}

/**
 * Starts a checkout session for the given plan+cycle.
 * Mock mode when Stripe is not configured: returns synthetic URL and
 * activates subscription immediately (no external round-trip).
 */
export async function startCheckoutForOrg(input: {
  organizationId: string;
  planCode: string;
  cycle: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; provider: 'stripe' | 'mock' }> {
  if (!isStripeConfigured()) {
    // Fall back to mock activation (kept from Fase 6)
    const admin = createSupabaseAdminClient();
    const { data: plan } = await admin.from('plans').select('id').eq('code', input.planCode).maybeSingle<{ id: string }>();
    if (!plan) throw new Error(`plan ${input.planCode} not found`);
    const periodEnd = new Date();
    if (input.cycle === 'yearly') periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
    else periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

    await admin.from('organizations').update({
      plan_id: plan.id,
      subscription_status: 'active',
      trial_ends_at: null,
      dunning_stage: 0
    }).eq('id', input.organizationId);

    const { data: existing } = await admin
      .from('subscriptions').select('id')
      .eq('organization_id', input.organizationId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle<{ id: string }>();
    if (existing) {
      await admin.from('subscriptions').update({
        plan_id: plan.id, status: 'active', billing_cycle: input.cycle,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        external_provider: 'mock'
      }).eq('id', existing.id);
    } else {
      await admin.from('subscriptions').insert({
        organization_id: input.organizationId, plan_id: plan.id,
        status: 'active', billing_cycle: input.cycle,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        external_provider: 'mock'
      });
    }

    return { url: `${input.successUrl}?mock=1`, provider: 'mock' };
  }

  const customerId = await ensureCustomer(input.organizationId);
  const priceId = await resolvePriceId(input.planCode, input.cycle);
  if (!priceId) throw new Error(`No Stripe price configured for ${input.planCode}/${input.cycle}`);

  const session = await stripeCheckout({
    customerId,
    priceId,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    organizationId: input.organizationId,
    planCode: input.planCode,
    cycle: input.cycle
  });
  return { url: session.url, provider: 'stripe' };
}

/**
 * Opens the Stripe Customer Portal (self-service billing management).
 */
export async function openCustomerPortal(input: {
  organizationId: string;
  returnUrl: string;
}): Promise<string> {
  if (!isStripeConfigured()) throw new Error('Stripe not configured');
  const customerId = await ensureCustomer(input.organizationId);
  const session = await stripePortal({ customerId, returnUrl: input.returnUrl });
  return session.url;
}

/**
 * Immediate plan change (upgrade/downgrade). Prorates by default.
 */
export async function changePlan(input: {
  organizationId: string;
  planCode: string;
  cycle: 'monthly' | 'yearly';
  proration?: 'create_prorations' | 'none' | 'always_invoice';
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: sub } = await admin
    .from('subscriptions')
    .select('id, external_ref, external_provider')
    .eq('organization_id', input.organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; external_ref: string | null; external_provider: string | null }>();

  if (isStripeConfigured() && sub?.external_provider === 'stripe' && sub.external_ref) {
    const priceId = await resolvePriceId(input.planCode, input.cycle);
    if (!priceId) throw new Error(`No Stripe price for ${input.planCode}/${input.cycle}`);
    await stripeUpdate({
      subscriptionId: sub.external_ref,
      priceId,
      prorationBehavior: input.proration ?? 'create_prorations'
    });
    // Actual DB update comes via webhook customer.subscription.updated
    return;
  }

  // Fallback (mock): direct DB change
  const { data: plan } = await admin.from('plans').select('id').eq('code', input.planCode).maybeSingle<{ id: string }>();
  if (!plan) throw new Error('plan not found');
  const periodEnd = new Date();
  if (input.cycle === 'yearly') periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
  else periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

  await admin.from('organizations').update({ plan_id: plan.id }).eq('id', input.organizationId);
  if (sub) {
    await admin.from('subscriptions').update({
      plan_id: plan.id,
      billing_cycle: input.cycle,
      current_period_end: periodEnd.toISOString()
    }).eq('id', sub.id);
  }
}

/**
 * Cancels the org's subscription. `atPeriodEnd=true` keeps access until
 * the current period ends; false cancels immediately.
 */
export async function cancelForOrg(input: { organizationId: string; atPeriodEnd: boolean }): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: sub } = await admin
    .from('subscriptions')
    .select('id, external_ref, external_provider')
    .eq('organization_id', input.organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; external_ref: string | null; external_provider: string | null }>();
  if (!sub) return;

  if (isStripeConfigured() && sub.external_provider === 'stripe' && sub.external_ref) {
    await stripeCancel({ subscriptionId: sub.external_ref, atPeriodEnd: input.atPeriodEnd });
    return;
  }
  await admin.from('subscriptions').update({
    status: input.atPeriodEnd ? 'active' : 'cancelled',
    cancel_at_period_end: input.atPeriodEnd,
    cancelled_at: input.atPeriodEnd ? null : new Date().toISOString()
  }).eq('id', sub.id);
  if (!input.atPeriodEnd) {
    await admin.from('organizations').update({ subscription_status: 'cancelled' }).eq('id', input.organizationId);
  }
}

/**
 * Idempotent billing event recorder. Returns true if this is a new event.
 */
export async function recordBillingEvent(input: {
  provider: string;
  externalEventId: string;
  eventType: string;
  organizationId: string | null;
  payload: unknown;
}): Promise<{ isNew: boolean; id: string | null }> {
  const admin = createSupabaseAdminClient();
  const payloadHash = createHash('sha256').update(JSON.stringify(input.payload)).digest('hex');
  const { data, error } = await admin
    .from('billing_events')
    .insert({
      provider: input.provider,
      external_event_id: input.externalEventId,
      event_type: input.eventType,
      organization_id: input.organizationId,
      payload_hash: payloadHash,
      payload: sanitizeForStorage(input.payload)
    })
    .select('id')
    .single<{ id: string }>();
  if (error) {
    // Unique violation → already recorded
    if (error.code === '23505') return { isNew: false, id: null };
    throw new Error(error.message);
  }
  return { isNew: true, id: data.id };
}

export async function markBillingEventProcessed(id: string, error?: string) {
  const admin = createSupabaseAdminClient();
  await admin.from('billing_events').update({
    status: error ? 'failed' : 'processed',
    processed_at: new Date().toISOString(),
    error
  }).eq('id', id);
}

function sanitizeForStorage(payload: unknown): unknown {
  // Remove obvious card fields — Stripe already never sends full PAN via webhooks,
  // but we defensively strip nested `card` objects to reduce risk of accidental
  // leakage if a future provider is added.
  if (typeof payload !== 'object' || !payload) return payload;
  const clone = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  redactKeys(clone, ['number', 'cvc', 'cvv', 'password', 'secret']);
  return clone;
}

function redactKeys(obj: Record<string, unknown>, keys: string[]) {
  for (const [k, v] of Object.entries(obj)) {
    if (keys.includes(k)) obj[k] = '***';
    else if (v && typeof v === 'object') redactKeys(v as Record<string, unknown>, keys);
  }
}
