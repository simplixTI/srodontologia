import 'server-only';
import { createMockBillingProvider } from './providers/mock';
import { createStripeBillingProvider } from './providers/stripe';
import type { BillingProvider } from './types';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Resolves the billing provider for the platform.
 *
 * Priority:
 *   1) platform-wide setting (system_settings.key='billing.provider' at NULL org — future)
 *   2) STRIPE_SECRET_KEY present → Stripe
 *   3) fallback → Mock
 */
export async function resolvePlatformBillingProvider(): Promise<BillingProvider> {
  if (process.env.STRIPE_SECRET_KEY) return createStripeBillingProvider();
  return createMockBillingProvider();
}

/**
 * Records a subscription event + updates the org's subscription row after
 * a successful checkout. Called by webhook receiver + mock checkout confirm.
 */
export async function activateSubscription(input: {
  organizationId: string;
  planCode: string;
  cycle: 'monthly' | 'yearly';
  externalRef: string | null;
  provider: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { data: plan } = await admin
    .from('plans')
    .select('id')
    .eq('code', input.planCode)
    .maybeSingle<{ id: string }>();
  if (!plan) throw new Error(`plan ${input.planCode} not found`);

  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  if (input.cycle === 'yearly') periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
  else periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

  await admin
    .from('organizations')
    .update({
      plan_id: plan.id,
      subscription_status: 'active',
      trial_ends_at: null,
      suspended_at: null,
      suspended_reason: null
    })
    .eq('id', input.organizationId);

  const { data: existing } = await admin
    .from('subscriptions')
    .select('id')
    .eq('organization_id', input.organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (existing) {
    await admin
      .from('subscriptions')
      .update({
        plan_id: plan.id,
        status: 'active',
        billing_cycle: input.cycle,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        cancelled_at: null,
        external_provider: input.provider,
        external_ref: input.externalRef
      })
      .eq('id', existing.id);
  } else {
    const { data: sub } = await admin
      .from('subscriptions')
      .insert({
        organization_id: input.organizationId,
        plan_id: plan.id,
        status: 'active',
        billing_cycle: input.cycle,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        external_provider: input.provider,
        external_ref: input.externalRef
      })
      .select('id')
      .single<{ id: string }>();
    if (sub) {
      await admin.from('subscription_events').insert({
        subscription_id: sub.id,
        organization_id: input.organizationId,
        event_type: 'created',
        to_plan_id: plan.id,
        metadata: { provider: input.provider, external_ref: input.externalRef }
      });
    }
  }
}
