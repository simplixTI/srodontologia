import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type ServiceStatus = 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance';

export type ServiceCheck = {
  key: string;
  label: string;
  status: ServiceStatus;
  detail?: string;
};

/**
 * Snapshot of the platform's real health. Never invents data — every value
 * comes from a query on our own tables or env presence check.
 */
export async function getPlatformStatus(): Promise<ServiceCheck[]> {
  const admin = createSupabaseAdminClient();
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 3600_000).toISOString();

  const [db, queueQueued, deadLetter, failedRecent, webhooksRecent, cronsRecent] = await Promise.all([
    check(async () => {
      const { error } = await admin.from('organizations').select('id', { head: true, count: 'exact' }).limit(1);
      if (error) throw new Error(error.message);
    }),
    admin.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'queued'),
    admin.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'dead_letter'),
    admin.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('updated_at', yesterday),
    admin.from('billing_events').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('received_at', yesterday),
    admin.from('cron_runs').select('id, status, started_at').gte('started_at', yesterday).order('started_at', { ascending: false }).limit(20)
  ]);

  const queued = queueQueued.count ?? 0;
  const dead = deadLetter.count ?? 0;
  const failed24 = failedRecent.count ?? 0;
  const webhookFail24 = webhooksRecent.count ?? 0;

  const cronRows = (cronsRecent.data ?? []) as { status: string; started_at: string }[];
  const cronRecentFailed = cronRows.filter((r) => r.status === 'failed').length;
  const cronRanRecent = cronRows.length > 0;

  return [
    {
      key: 'app',
      label: 'Aplicação (Next.js)',
      status: 'operational',
      detail: `versão ${process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev'}`
    },
    {
      key: 'database',
      label: 'Banco de dados (Supabase)',
      status: db.ok ? 'operational' : 'major_outage',
      detail: db.ok ? `latência ${db.ms}ms` : db.error
    },
    {
      key: 'queue',
      label: 'Fila de jobs',
      status:
        dead > 10 ? 'partial_outage' :
        queued > 500 ? 'degraded' :
        'operational',
      detail: `${queued} pendentes · ${dead} dead-letter · ${failed24} falhos em 24h`
    },
    {
      key: 'billing',
      label: 'Billing (Stripe webhook)',
      status: !process.env.STRIPE_SECRET_KEY
        ? 'maintenance'
        : webhookFail24 > 5
        ? 'degraded'
        : 'operational',
      detail: !process.env.STRIPE_SECRET_KEY
        ? 'chave não configurada (modo mock)'
        : `${webhookFail24} webhooks falhos 24h`
    },
    {
      key: 'email',
      label: 'E-mail transacional',
      status: process.env.EMAIL_API_KEY ? 'operational' : 'maintenance',
      detail: process.env.EMAIL_API_KEY ? 'provider configurado' : 'sem provider (queue logging apenas)'
    },
    {
      key: 'ai',
      label: 'Provedor de IA',
      status: (process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_AI_API_KEY)
        ? 'operational'
        : 'maintenance',
      detail: 'fallback: mock provider'
    },
    {
      key: 'cron',
      label: 'Cron jobs',
      status: !cronRanRecent
        ? 'partial_outage'
        : cronRecentFailed > 3
        ? 'degraded'
        : 'operational',
      detail: cronRanRecent ? `${cronRows.length} execuções em 24h (${cronRecentFailed} falhas)` : 'nenhuma execução nas últimas 24h'
    }
  ];
}

async function check(fn: () => Promise<void>): Promise<{ ok: boolean; ms: number; error?: string }> {
  const t0 = Date.now();
  try {
    await fn();
    return { ok: true, ms: Date.now() - t0 };
  } catch (err) {
    return { ok: false, ms: Date.now() - t0, error: err instanceof Error ? err.message : 'error' };
  }
}
