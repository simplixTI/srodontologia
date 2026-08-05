import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { verifyDomain } from './verifier';

/**
 * Periodic DNS revalidation for all tenant domains.
 *
 * Frequency guidance:
 *  - `pending`, `awaiting_dns`, `verifying`: every 15 minutes
 *  - `verified`, `active`, `ssl_active`: once/day
 *  - `failed`: exponential backoff (handled by consecutive_failures)
 *
 * Each check appends to `domain_verification_history` so ops can trace
 * "when did DNS start failing?". Never removes a domain automatically.
 */
export async function revalidateDomainsTick(): Promise<{
  scanned: number;
  revalidated: number;
  degraded: number;
}> {
  const admin = createSupabaseAdminClient();
  const now = new Date();

  const { data: due } = await admin
    .from('tenant_domains')
    .select('id, organization_id, hostname, status, consecutive_failures, next_check_at')
    .or(`next_check_at.is.null,next_check_at.lte.${now.toISOString()}`)
    .is('disabled_at', null)
    .limit(50);

  let revalidated = 0;
  let degraded = 0;

  for (const raw of due ?? []) {
    const d = raw as {
      id: string;
      organization_id: string;
      hostname: string;
      status: string;
      consecutive_failures: number;
    };
    const prevStatus = d.status;
    const result = await verifyDomain(d.id).catch((e) => ({
      status: 'failed' as const,
      error: e instanceof Error ? e.message : 'error'
    }));

    const nextCheck = pickNextCheck(prevStatus, result.status, d.consecutive_failures);
    const failures = result.status === 'verified' ? 0 : d.consecutive_failures + 1;

    await admin.from('tenant_domains').update({
      next_check_at: nextCheck.toISOString(),
      consecutive_failures: failures
    }).eq('id', d.id);

    await admin.from('domain_verification_history').insert({
      domain_id: d.id,
      organization_id: d.organization_id,
      action: 'revalidate',
      prev_status: prevStatus,
      new_status: result.status === 'verified' ? 'verified' : prevStatus,
      error: 'error' in result ? result.error : null
    });

    if (result.status === 'verified') revalidated++;
    else if (failures >= 3) {
      degraded++;
      // Best-effort alert
      await admin.from('operational_alerts').insert({
        organization_id: d.organization_id,
        source: 'domains',
        severity: 'warning',
        title: `DNS falhando: ${d.hostname}`,
        message: `${failures} verificações consecutivas falharam. Cliente deve revisar o DNS.`,
        metadata: { domain_id: d.id, hostname: d.hostname }
      });
    }
  }
  return { scanned: (due ?? []).length, revalidated, degraded };
}

function pickNextCheck(prev: string, next: string, failures: number): Date {
  const inMin = (m: number) => new Date(Date.now() + m * 60_000);
  if (next === 'verified' || prev === 'active' || prev === 'ssl_active') return inMin(24 * 60);
  if (['pending', 'awaiting_dns', 'verifying'].includes(prev)) return inMin(15);
  // failed / verifying with failures — exponential up to 24h
  const backoff = Math.min(24 * 60, 15 * Math.pow(2, Math.min(failures, 6)));
  return inMin(backoff);
}
