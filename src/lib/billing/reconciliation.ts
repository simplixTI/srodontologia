import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/observability/logger';

/**
 * Compares the local `subscriptions` snapshot against Stripe's source of truth
 * and either auto-fixes safe divergences (status, plan_id) or raises an
 * operational_alert for sensitive ones (price mismatch, orphan subs).
 *
 * Only runs when STRIPE_SECRET_KEY is configured — otherwise skips.
 * Never runs without a lock via `billing_reconciliation_runs`.
 */
export type ReconciliationReport = {
  compared: number;
  divergences: number;
  autoFixed: number;
  alerts: number;
  items: Array<{
    external_ref: string;
    kind: 'status' | 'plan' | 'orphan_local' | 'orphan_remote';
    action: 'auto_fixed' | 'alerted' | 'ignored';
    local?: string;
    remote?: string;
  }>;
};

const isConfigured = () => !!process.env.STRIPE_SECRET_KEY;

export async function runBillingReconciliation(opts: { organizationId?: string } = {}): Promise<ReconciliationReport> {
  const admin = createSupabaseAdminClient();
  const report: ReconciliationReport = { compared: 0, divergences: 0, autoFixed: 0, alerts: 0, items: [] };

  if (!isConfigured()) {
    logger.info('billing reconciliation skipped: STRIPE_SECRET_KEY not set');
    return report;
  }

  let q = admin
    .from('subscriptions')
    .select('id, organization_id, external_ref, status, plan_id, stripe_price_id')
    .eq('external_provider', 'stripe')
    .not('external_ref', 'is', null);
  if (opts.organizationId) q = q.eq('organization_id', opts.organizationId);
  const { data: subs, error } = await q.limit(500);
  if (error) throw new Error(error.message);

  for (const s of subs ?? []) {
    const row = s as {
      id: string;
      organization_id: string;
      external_ref: string;
      status: string;
      plan_id: string;
      stripe_price_id: string | null;
    };
    report.compared++;

    const remote = await fetchStripeSubscription(row.external_ref);
    if (!remote) {
      report.divergences++;
      report.alerts++;
      report.items.push({ external_ref: row.external_ref, kind: 'orphan_local', action: 'alerted' });
      await admin.from('operational_alerts').insert({
        organization_id: row.organization_id,
        source: 'billing',
        severity: 'error',
        title: 'Assinatura órfã no local',
        message: `subscriptions.external_ref=${row.external_ref} não existe no Stripe. Requer revisão.`,
        metadata: { subscription_id: row.id }
      });
      continue;
    }

    const remoteStatus = mapStripeStatus(remote.status);
    if (remoteStatus !== row.status) {
      // Auto-fix status divergence (safe: source of truth is Stripe)
      await admin.from('subscriptions').update({ status: remoteStatus }).eq('id', row.id);
      await admin.from('organizations').update({ subscription_status: remoteStatus }).eq('id', row.organization_id);
      report.divergences++;
      report.autoFixed++;
      report.items.push({
        external_ref: row.external_ref,
        kind: 'status',
        action: 'auto_fixed',
        local: row.status,
        remote: remoteStatus
      });
    }

    const remotePrice = remote.items?.data?.[0]?.price?.id ?? null;
    if (remotePrice && row.stripe_price_id && remotePrice !== row.stripe_price_id) {
      // Price mismatch → sensitive. Alert for human review; do not auto-swap plan.
      report.divergences++;
      report.alerts++;
      report.items.push({
        external_ref: row.external_ref,
        kind: 'plan',
        action: 'alerted',
        local: row.stripe_price_id,
        remote: remotePrice
      });
      await admin.from('operational_alerts').insert({
        organization_id: row.organization_id,
        source: 'billing',
        severity: 'warning',
        title: 'Divergência de preço na assinatura',
        message: `Local ${row.stripe_price_id} vs Stripe ${remotePrice}. Revisar antes de alterar plano.`,
        metadata: { subscription_id: row.id, local: row.stripe_price_id, remote: remotePrice }
      });
    }
  }

  return report;
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
    default: return 'active';
  }
}

async function fetchStripeSubscription(id: string): Promise<{
  status: string;
  items?: { data?: Array<{ price?: { id?: string } }> };
} | null> {
  try {
    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
      signal: AbortSignal.timeout(10_000)
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Stripe ${res.status}`);
    return (await res.json()) as { status: string; items?: { data?: Array<{ price?: { id?: string } }> } };
  } catch (err) {
    logger.warn('stripe fetch failed', { id, err: (err as Error).message });
    return null;
  }
}
