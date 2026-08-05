import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type LimitMetric =
  | 'users'
  | 'clinics'
  | 'dentists'
  | 'cases_month'
  | 'storage_bytes'
  | 'ocr_month'
  | 'ai_tokens_month'
  | 'api_calls_month'
  | 'automations'
  | 'webhooks';

const METRIC_TO_PLAN_COLUMN: Record<LimitMetric, string> = {
  users: 'max_users',
  clinics: 'max_clinics',
  dentists: 'max_dentists',
  cases_month: 'max_cases_month',
  storage_bytes: 'max_storage_gb', // GB → bytes conversion below
  ocr_month: 'max_ocr_month',
  ai_tokens_month: 'max_ai_tokens_month',
  api_calls_month: 'max_api_calls_month',
  automations: 'max_automations',
  webhooks: 'max_webhooks'
};

const PERIODIC_METRICS: LimitMetric[] = [
  'cases_month',
  'ocr_month',
  'ai_tokens_month',
  'api_calls_month'
];

export type LimitCheck = {
  ok: boolean;
  current: number;
  limit: number | null; // null = unlimited
  remaining: number | null;
  reason?: 'limit_reached' | 'suspended' | 'no_plan';
};

/**
 * Checks whether an org can perform an operation for the given metric.
 * Suspended orgs always fail. Orgs on a plan with `null` limit are unlimited.
 *
 * Read-only — does NOT increment the counter. Call incrementUsage() after
 * a successful write to keep counters in sync.
 */
export async function checkLimit(organizationId: string, metric: LimitMetric): Promise<LimitCheck> {
  const admin = createSupabaseAdminClient();

  const { data: org } = await admin
    .from('organizations')
    .select(`subscription_status, plan:plans(${METRIC_TO_PLAN_COLUMN[metric]})`)
    .eq('id', organizationId)
    .maybeSingle<{
      subscription_status: string;
      plan: Record<string, number | null> | null;
    }>();

  if (!org) return { ok: false, current: 0, limit: 0, remaining: 0, reason: 'no_plan' };
  if (['suspended', 'cancelled', 'expired'].includes(org.subscription_status)) {
    return { ok: false, current: 0, limit: 0, remaining: 0, reason: 'suspended' };
  }
  if (!org.plan) return { ok: false, current: 0, limit: 0, remaining: 0, reason: 'no_plan' };

  let limit = org.plan[METRIC_TO_PLAN_COLUMN[metric]] ?? null;
  // Convert GB → bytes for storage
  if (metric === 'storage_bytes' && limit !== null) limit = Number(limit) * 1024 * 1024 * 1024;

  const period = PERIODIC_METRICS.includes(metric) ? firstOfMonth() : null;
  const { data: counter } = await admin
    .from('tenant_usage_counters')
    .select('current_value')
    .eq('organization_id', organizationId)
    .eq('metric', metric)
    .eq('period_start', period as unknown as string | null)
    .maybeSingle<{ current_value: number }>();

  const current = Number(counter?.current_value ?? 0);
  if (limit === null) return { ok: true, current, limit: null, remaining: null };
  const ok = current < Number(limit);
  return {
    ok,
    current,
    limit: Number(limit),
    remaining: Math.max(0, Number(limit) - current),
    reason: ok ? undefined : 'limit_reached'
  };
}

/**
 * Throws a friendly error if the limit is reached — designed for use inside
 * server actions that create resources.
 */
export async function assertWithinLimit(organizationId: string, metric: LimitMetric): Promise<void> {
  const check = await checkLimit(organizationId, metric);
  if (!check.ok) {
    if (check.reason === 'suspended')
      throw new Error('Sua conta está suspensa. Regularize o pagamento para continuar.');
    if (check.reason === 'no_plan')
      throw new Error('Sem plano ativo. Escolha um plano em /billing.');
    throw new Error(
      `Limite de ${metric} do seu plano atingido (${check.current}/${check.limit}). Faça upgrade em /billing.`
    );
  }
}

export async function incrementUsage(
  organizationId: string,
  metric: LimitMetric,
  delta = 1
): Promise<number> {
  const admin = createSupabaseAdminClient();
  const period = PERIODIC_METRICS.includes(metric) ? firstOfMonth() : null;
  const { data } = await admin.rpc('increment_usage', {
    p_org_id: organizationId,
    p_metric: metric,
    p_delta: delta,
    p_period: period
  });
  return Number(data ?? 0);
}

function firstOfMonth(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
