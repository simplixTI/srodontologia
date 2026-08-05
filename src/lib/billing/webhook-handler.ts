import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { recordBillingEvent, markBillingEventProcessed } from './service';

/**
 * Stripe webhook handler with:
 *  - HMAC signature validation
 *  - Timestamp tolerance (5min) → prevents replay
 *  - Idempotency via billing_events (unique on provider+external_event_id)
 *  - Coverage of every event the app cares about
 */
const TOLERANCE_SECONDS = 300;

export type WebhookResult =
  | { ok: true; status: 'processed' | 'duplicate' | 'skipped'; note?: string }
  | { ok: false; status: 401 | 400 | 500; error: string };

export async function handleStripeWebhook(
  headers: Record<string, string>,
  rawBody: string
): Promise<WebhookResult> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return { ok: false, status: 500, error: 'webhook_secret_missing' };

  const signature = headers['stripe-signature'] ?? headers['Stripe-Signature'];
  if (!signature) return { ok: false, status: 401, error: 'no_signature' };

  const verification = verifyStripeSignature(rawBody, signature, secret);
  if (!verification.ok) return { ok: false, status: 401, error: verification.reason };

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { ok: false, status: 400, error: 'invalid_json' };
  }

  const orgId = extractOrgId(event);

  const rec = await recordBillingEvent({
    provider: 'stripe',
    externalEventId: event.id,
    eventType: event.type,
    organizationId: orgId,
    payload: event
  });
  if (!rec.isNew) return { ok: true, status: 'duplicate' };

  try {
    await dispatch(event);
    if (rec.id) await markBillingEventProcessed(rec.id);
    return { ok: true, status: 'processed' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    if (rec.id) await markBillingEventProcessed(rec.id, msg);
    return { ok: false, status: 500, error: msg };
  }
}

type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

function extractOrgId(event: StripeEvent): string | null {
  const obj = event.data.object as {
    metadata?: { organization_id?: string };
    subscription_details?: { metadata?: { organization_id?: string } };
    customer?: string;
  };
  return (
    obj.metadata?.organization_id ??
    obj.subscription_details?.metadata?.organization_id ??
    null
  );
}

function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): { ok: true } | { ok: false; reason: string } {
  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, p) => {
    const [k, v] = p.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});
  if (!parts.t || !parts.v1) return { ok: false, reason: 'malformed_signature' };

  const tsNum = parseInt(parts.t, 10);
  if (!Number.isFinite(tsNum)) return { ok: false, reason: 'invalid_timestamp' };
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsNum) > TOLERANCE_SECONDS) return { ok: false, reason: 'timestamp_out_of_tolerance' };

  const expected = createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex');
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(parts.v1, 'hex');
    if (a.length !== b.length) return { ok: false, reason: 'signature_length_mismatch' };
    if (!timingSafeEqual(a, b)) return { ok: false, reason: 'signature_mismatch' };
  } catch {
    return { ok: false, reason: 'signature_compare_failed' };
  }
  return { ok: true };
}

async function dispatch(event: StripeEvent): Promise<void> {
  const admin = createSupabaseAdminClient();
  const obj = event.data.object as Record<string, unknown>;

  switch (event.type) {
    case 'checkout.session.completed':
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await syncSubscription(admin, obj);
      break;

    case 'customer.subscription.deleted': {
      const orgId = getOrgFromMetadata(obj);
      if (orgId) {
        await admin.from('organizations')
          .update({ subscription_status: 'cancelled' })
          .eq('id', orgId);
        await admin.from('subscriptions').update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        }).eq('external_ref', obj.id as string);
      }
      break;
    }

    case 'invoice.created':
    case 'invoice.finalized':
    case 'invoice.paid':
    case 'invoice.payment_failed':
    case 'invoice.payment_action_required':
      await upsertInvoice(admin, obj, event.type);
      if (event.type === 'invoice.paid') await onInvoicePaid(admin, obj);
      if (event.type === 'invoice.payment_failed') await onPaymentFailed(admin, obj);
      break;

    case 'charge.refunded':
      // Registered via billing_events; no state change needed here.
      break;

    default:
      // Not interesting to us — recorded but no side-effect
      break;
  }
}

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

function getOrgFromMetadata(obj: Record<string, unknown>): string | null {
  const md = obj.metadata as { organization_id?: string } | undefined;
  return md?.organization_id ?? null;
}

async function syncSubscription(admin: AdminClient, obj: Record<string, unknown>) {
  // Handles both checkout.session.completed and subscription events.
  // On checkout, the sub id is on `obj.subscription`; on sub events, `obj.id`.
  const subExternalRef = (obj.subscription as string | undefined) ?? (obj.id as string);
  const orgId = getOrgFromMetadata(obj);
  if (!orgId || !subExternalRef) return;

  const status = (obj.status as string) ?? 'active';
  const currentPeriodStart = obj.current_period_start
    ? new Date((obj.current_period_start as number) * 1000).toISOString()
    : new Date().toISOString();
  const currentPeriodEnd = obj.current_period_end
    ? new Date((obj.current_period_end as number) * 1000).toISOString()
    : null;
  const cancelAtPeriodEnd = Boolean(obj.cancel_at_period_end);
  const priceId = ((obj.items as { data?: { price?: { id?: string } }[] } | undefined)?.data?.[0]?.price?.id) ?? null;
  const trialEnd = obj.trial_end ? new Date((obj.trial_end as number) * 1000).toISOString() : null;

  // Find plan by price_id (fallback to metadata plan_code)
  let planId: string | null = null;
  if (priceId) {
    const { data: p } = await admin
      .from('plans')
      .select('id')
      .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
      .maybeSingle<{ id: string }>();
    planId = p?.id ?? null;
  }
  if (!planId) {
    const planCode = (obj.metadata as { plan_code?: string })?.plan_code;
    if (planCode) {
      const { data: p } = await admin.from('plans').select('id').eq('code', planCode).maybeSingle<{ id: string }>();
      planId = p?.id ?? null;
    }
  }
  if (!planId) return;

  const cycleMeta = ((obj.metadata as { cycle?: string })?.cycle) as 'monthly' | 'yearly' | undefined;

  const patch = {
    organization_id: orgId,
    plan_id: planId,
    status: mapStripeStatus(status),
    billing_cycle: cycleMeta ?? 'monthly',
    trial_ends_at: trialEnd,
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd ?? currentPeriodStart,
    cancel_at_period_end: cancelAtPeriodEnd,
    external_provider: 'stripe',
    external_ref: subExternalRef,
    stripe_price_id: priceId
  };

  const { data: existing } = await admin
    .from('subscriptions').select('id')
    .eq('external_ref', subExternalRef)
    .maybeSingle<{ id: string }>();

  if (existing) {
    await admin.from('subscriptions').update(patch).eq('id', existing.id);
  } else {
    await admin.from('subscriptions').insert(patch);
  }

  // Mirror organization status
  await admin.from('organizations').update({
    plan_id: planId,
    subscription_status: patch.status,
    trial_ends_at: trialEnd,
    dunning_stage: patch.status === 'active' ? 0 : undefined
  }).eq('id', orgId);
}

function mapStripeStatus(s: string): string {
  switch (s) {
    case 'trialing': return 'trial';
    case 'active': return 'active';
    case 'past_due': return 'past_due';
    case 'unpaid':
    case 'incomplete_expired':
    case 'canceled': return 'cancelled';
    case 'paused': return 'suspended';
    case 'incomplete': return 'past_due';
    default: return 'active';
  }
}

async function upsertInvoice(admin: AdminClient, obj: Record<string, unknown>, eventType: string) {
  const orgId = getOrgFromMetadata(obj);
  const externalRef = obj.id as string;
  const status = (obj.status as string) ?? 'open';
  const amount = ((obj.amount_paid as number) ?? (obj.amount_due as number) ?? 0) / 100;
  const currency = (obj.currency as string)?.toUpperCase() ?? 'BRL';
  const hostedUrl = (obj.hosted_invoice_url as string) ?? null;
  const pdfUrl = (obj.invoice_pdf as string) ?? null;
  const dueTs = obj.due_date as number | null;

  await admin.from('invoices').upsert(
    {
      organization_id: orgId,
      external_provider: 'stripe',
      external_ref: externalRef,
      invoice_number: (obj.number as string) ?? externalRef,
      status: mapInvoiceStatus(status, eventType),
      currency,
      total: amount,
      subtotal: ((obj.subtotal as number) ?? 0) / 100,
      due_date: dueTs ? new Date(dueTs * 1000).toISOString().slice(0, 10) : null,
      hosted_url: hostedUrl,
      pdf_url: pdfUrl,
      issued_at: obj.created ? new Date((obj.created as number) * 1000).toISOString() : new Date().toISOString(),
      paid_at: eventType === 'invoice.paid' ? new Date().toISOString() : null
    },
    { onConflict: 'external_ref' }
  );
}

function mapInvoiceStatus(stripeStatus: string, eventType: string): string {
  if (eventType === 'invoice.paid' || stripeStatus === 'paid') return 'paid';
  if (stripeStatus === 'draft') return 'draft';
  if (stripeStatus === 'void') return 'void';
  if (stripeStatus === 'open') return 'open';
  if (stripeStatus === 'uncollectible') return 'past_due';
  return 'open';
}

async function onInvoicePaid(admin: AdminClient, obj: Record<string, unknown>) {
  const orgId = getOrgFromMetadata(obj);
  if (!orgId) return;
  await admin.from('organizations').update({
    subscription_status: 'active',
    dunning_stage: 0,
    suspended_at: null,
    suspended_reason: null
  }).eq('id', orgId);
}

async function onPaymentFailed(admin: AdminClient, obj: Record<string, unknown>) {
  const orgId = getOrgFromMetadata(obj);
  if (!orgId) return;
  await admin.from('organizations').update({
    subscription_status: 'past_due',
    dunning_last_event_at: new Date().toISOString()
  }).eq('id', orgId);
  await admin.from('operational_alerts').insert({
    organization_id: orgId,
    source: 'billing',
    severity: 'warning',
    title: 'Falha em cobrança',
    message: `Fatura ${(obj.id as string)?.slice(0, 20)}… não foi paga.`
  });
}
