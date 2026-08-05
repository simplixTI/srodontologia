import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type TenantRow = {
  id: string;
  name: string;
  slug: string | null;
  plan_id: string | null;
  plan_name: string | null;
  subscription_status: string;
  trial_ends_at: string | null;
  owner_id: string | null;
  suspended_at: string | null;
  deleted_at: string | null;
  custom_domain: string | null;
  health_score: number | null;
  last_activity_at: string | null;
  created_at: string;
};

export type PlanRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  currency: string;
  is_public: boolean;
  sort_order: number;
  max_users: number | null;
  max_clinics: number | null;
  max_dentists: number | null;
  max_cases_month: number | null;
  max_storage_gb: number | null;
  max_ocr_month: number | null;
  max_ai_tokens_month: number | null;
  max_api_calls_month: number | null;
  max_automations: number | null;
  max_webhooks: number | null;
  features: Record<string, boolean>;
};

export async function listTenants(): Promise<TenantRow[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('organizations')
    .select(
      'id, name, slug, plan_id, subscription_status, trial_ends_at, owner_id, suspended_at, deleted_at, custom_domain, health_score, last_activity_at, created_at, plan:plans(name)'
    )
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    ...(r as unknown as TenantRow),
    plan_name: ((r as { plan?: { name?: string } | null }).plan?.name) ?? null
  }));
}

export async function getTenant(id: string) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('organizations')
    .select(
      'id, name, legal_name, document, email, phone, whatsapp, slug, plan_id, subscription_status, trial_ends_at, owner_id, suspended_at, suspended_reason, deleted_at, branding, custom_domain, health_score, last_activity_at, created_at, plan:plans(id, name, code, monthly_price, yearly_price)'
    )
    .eq('id', id)
    .maybeSingle();
  return data;
}

export async function listPlans(): Promise<PlanRow[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('plans')
    .select(
      'id, code, name, description, monthly_price, yearly_price, currency, is_public, sort_order, max_users, max_clinics, max_dentists, max_cases_month, max_storage_gb, max_ocr_month, max_ai_tokens_month, max_api_calls_month, max_automations, max_webhooks, features'
    )
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as PlanRow[];
}

export async function getPlatformStats() {
  const admin = createSupabaseAdminClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [total, active, trial, suspended, users, casesMonth, revenueRow] = await Promise.all([
    admin.from('organizations').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    admin.from('organizations').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active').is('deleted_at', null),
    admin.from('organizations').select('id', { count: 'exact', head: true }).eq('subscription_status', 'trial').is('deleted_at', null),
    admin.from('organizations').select('id', { count: 'exact', head: true }).in('subscription_status', ['suspended', 'past_due']).is('deleted_at', null),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('cases').select('id', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString()),
    admin.from('invoices').select('total').eq('status', 'paid').gte('paid_at', monthStart.toISOString())
  ]);

  const mrr = (revenueRow.data ?? []).reduce(
    (s: number, r: { total: number }) => s + Number(r.total ?? 0),
    0
  );

  return {
    totalTenants: total.count ?? 0,
    activeTenants: active.count ?? 0,
    trialTenants: trial.count ?? 0,
    suspendedTenants: suspended.count ?? 0,
    totalUsers: users.count ?? 0,
    casesThisMonth: casesMonth.count ?? 0,
    mrr
  };
}

export async function listSubscriptions(limit = 100) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('subscriptions')
    .select('id, status, billing_cycle, trial_ends_at, current_period_end, cancel_at_period_end, external_provider, created_at, organization:organizations(name), plan:plans(name, code)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listInvoices(limit = 100) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('invoices')
    .select('id, invoice_number, status, currency, total, due_date, issued_at, paid_at, hosted_url, organization:organizations(name)')
    .order('issued_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listFeatureFlagsWithOverrides() {
  const admin = createSupabaseAdminClient();
  const [flags, overrides] = await Promise.all([
    admin.from('feature_flags').select('key, description, default_enabled, category').order('category').order('key'),
    admin.from('feature_flag_overrides').select('flag_key, target_type, target_id, enabled, reason')
  ]);
  const overridesByKey = new Map<string, { target_type: string; target_id: string; enabled: boolean; reason: string | null }[]>();
  for (const o of overrides.data ?? []) {
    const arr = overridesByKey.get(o.flag_key as string) ?? [];
    arr.push(o as never);
    overridesByKey.set(o.flag_key as string, arr);
  }
  return (flags.data ?? []).map((f) => ({
    ...(f as { key: string; description: string; default_enabled: boolean; category: string }),
    overrides: overridesByKey.get((f as { key: string }).key) ?? []
  }));
}

export async function listSupportTicketsPlatform(limit = 100) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('support_tickets')
    .select('id, subject, status, priority, created_at, resolved_at, organization:organizations(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listSecurityEvents(limit = 200) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('security_events')
    .select('id, event_type, ip, user_agent, metadata, created_at, organization:organizations(name), user:profiles!user_id(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}
