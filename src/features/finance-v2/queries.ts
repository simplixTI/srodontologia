import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  CashFlowPoint,
  Commission,
  CommissionWithMeta,
  CostCenter,
  DreRow,
  FinCategory,
  FinCategoryKind,
  FinTransaction,
  FinanceKpis,
  PayableStatus,
  PayableWithMeta,
  PayablesSummary
} from './types';

// ─── Categories ───────────────────────────────────────────
export async function listCategories(kind?: FinCategoryKind): Promise<FinCategory[]> {
  const supabase = createSupabaseServerClient();
  let q = supabase.from('fin_categories').select('*').order('kind').order('name');
  if (kind) q = q.eq('kind', kind);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as FinCategory[];
}

// ─── Cost centers ─────────────────────────────────────────
export async function listCostCenters(): Promise<CostCenter[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('fin_cost_centers')
    .select('*')
    .order('is_active', { ascending: false })
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as CostCenter[];
}

// ─── Payables ─────────────────────────────────────────────
export async function listPayables(filter?: { status?: PayableStatus }): Promise<PayableWithMeta[]> {
  const supabase = createSupabaseServerClient();
  let q = supabase
    .from('fin_accounts_payable')
    .select(`
      *,
      category:fin_categories ( name ),
      cost_center:fin_cost_centers ( name )
    `)
    .order('due_date', { ascending: true })
    .limit(200);
  if (filter?.status) q = q.eq('status', filter.status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    ...(r as unknown as PayableWithMeta),
    category_name: (r.category as { name?: string | null } | null)?.name ?? null,
    cost_center_name: (r.cost_center as { name?: string | null } | null)?.name ?? null
  }));
}

export async function getPayable(id: string): Promise<PayableWithMeta | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('fin_accounts_payable')
    .select(`
      *,
      category:fin_categories ( name ),
      cost_center:fin_cost_centers ( name )
    `)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const r = data as Record<string, unknown>;
  return {
    ...(r as unknown as PayableWithMeta),
    category_name: (r.category as { name?: string | null } | null)?.name ?? null,
    cost_center_name: (r.cost_center as { name?: string | null } | null)?.name ?? null
  };
}

// ─── Commissions ──────────────────────────────────────────
export async function listCommissions(): Promise<CommissionWithMeta[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('fin_commissions')
    .select(`
      *,
      beneficiary:profiles!fin_commissions_beneficiary_id_fkey ( full_name ),
      invoice:invoices ( invoice_number )
    `)
    .order('reference_month', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    ...(r as unknown as Commission),
    beneficiary_name: (r.beneficiary as { full_name?: string | null } | null)?.full_name ?? null,
    invoice_number: (r.invoice as { invoice_number?: string | null } | null)?.invoice_number ?? null
  }));
}

// ─── Transactions ─────────────────────────────────────────
export async function listTransactions(limit = 100): Promise<FinTransaction[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('fin_transactions')
    .select('*')
    .order('txn_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as FinTransaction[];
}

// ─── KPIs + views ─────────────────────────────────────────
export async function getKpis(): Promise<FinanceKpis | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('v_finance_kpis')
    .select('*')
    .maybeSingle<FinanceKpis>();
  if (error) throw new Error(error.message);
  return data;
}

export async function listCashFlow(): Promise<CashFlowPoint[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('v_cash_flow_daily')
    .select('*')
    .order('txn_date', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as CashFlowPoint[];
}

export async function listDreCurrentYear(): Promise<DreRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('v_dre_month')
    .select('*')
    .order('month', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DreRow[];
}

export async function getPayablesSummary(): Promise<PayablesSummary | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('v_payables_open')
    .select('*')
    .maybeSingle<PayablesSummary>();
  if (error) throw new Error(error.message);
  return data;
}

export async function listInternalProfiles(): Promise<Array<{ id: string; full_name: string; role: string }>> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .neq('role', 'dentist')
    .order('full_name');
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ id: string; full_name: string; role: string }>;
}
