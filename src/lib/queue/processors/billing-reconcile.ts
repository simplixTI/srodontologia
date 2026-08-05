import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { JobProcessor } from '../types';
import { runBillingReconciliation } from '@/lib/billing/reconciliation';

type Payload = { organization_id?: string };

export const processBillingReconcile: JobProcessor<Payload> = async (job) => {
  const admin = createSupabaseAdminClient();
  const { data: run } = await admin.from('billing_reconciliation_runs').insert({
    scope: job.payload.organization_id ? 'org' : 'all',
    organization_id: job.payload.organization_id ?? null
  }).select('id').single<{ id: string }>();

  try {
    const report = await runBillingReconciliation({ organizationId: job.payload.organization_id });
    if (run) {
      await admin.from('billing_reconciliation_runs').update({
        status: 'success',
        compared_count: report.compared,
        divergences_count: report.divergences,
        auto_fixed_count: report.autoFixed,
        alerts_count: report.alerts,
        report,
        completed_at: new Date().toISOString()
      }).eq('id', run.id);
    }
    return { compared: report.compared, autoFixed: report.autoFixed, alerts: report.alerts };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'error';
    if (run) {
      await admin.from('billing_reconciliation_runs').update({
        status: 'failed', error: msg, completed_at: new Date().toISOString()
      }).eq('id', run.id);
    }
    throw err;
  }
};
