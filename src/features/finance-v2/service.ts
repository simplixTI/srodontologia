import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  CategoryInput,
  CommissionInput,
  CostCenterInput,
  PayableInput
} from '@/lib/validations/finance-v2';
import type {
  Commission,
  CommissionStatus,
  CostCenter,
  FinCategory,
  Payable,
  PaymentMethod
} from './types';

// ─── Categories ───────────────────────────────────────────
export async function createCategory(orgId: string, input: CategoryInput): Promise<FinCategory> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('fin_categories')
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      kind: input.kind,
      code: input.code ?? null,
      parent_id: input.parent_id ?? null,
      is_active: input.is_active
    } as never)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as FinCategory;
}

export async function updateCategory(id: string, patch: Partial<CategoryInput>): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('fin_categories')
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
      ...(patch.code !== undefined ? { code: patch.code ?? null } : {}),
      ...(patch.parent_id !== undefined ? { parent_id: patch.parent_id ?? null } : {}),
      ...(patch.is_active !== undefined ? { is_active: patch.is_active } : {})
    } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('fin_categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Cost centers ─────────────────────────────────────────
export async function createCostCenter(orgId: string, input: CostCenterInput): Promise<CostCenter> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('fin_cost_centers')
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      code: input.code ?? null,
      description: input.description ?? null,
      is_active: input.is_active
    } as never)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as CostCenter;
}

export async function updateCostCenter(id: string, patch: Partial<CostCenterInput>): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('fin_cost_centers')
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.code !== undefined ? { code: patch.code ?? null } : {}),
      ...(patch.description !== undefined ? { description: patch.description ?? null } : {}),
      ...(patch.is_active !== undefined ? { is_active: patch.is_active } : {})
    } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteCostCenter(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('fin_cost_centers').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Payables ─────────────────────────────────────────────
export async function createPayable(orgId: string, input: PayableInput): Promise<Payable> {
  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('fin_accounts_payable')
    .insert({
      organization_id: orgId,
      supplier_name: input.supplier_name.trim(),
      description: input.description ?? null,
      category_id: input.category_id ?? null,
      cost_center_id: input.cost_center_id ?? null,
      amount: input.amount,
      due_date: input.due_date,
      external_reference: input.external_reference ?? null,
      notes: input.notes ?? null,
      created_by: userData.user?.id ?? null
    } as never)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Payable;
}

export async function updatePayable(id: string, patch: Partial<PayableInput>): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('fin_accounts_payable')
    .update({
      ...(patch.supplier_name !== undefined ? { supplier_name: patch.supplier_name.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description ?? null } : {}),
      ...(patch.category_id !== undefined ? { category_id: patch.category_id ?? null } : {}),
      ...(patch.cost_center_id !== undefined ? { cost_center_id: patch.cost_center_id ?? null } : {}),
      ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
      ...(patch.due_date !== undefined ? { due_date: patch.due_date } : {}),
      ...(patch.external_reference !== undefined
        ? { external_reference: patch.external_reference ?? null }
        : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes ?? null } : {})
    } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deletePayable(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('fin_accounts_payable').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function payPayable(
  id: string,
  paid_amount: number,
  method: PaymentMethod,
  notes: string | null
): Promise<Payable> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc('pay_payable', {
    p_payable_id: id,
    p_paid_amount: paid_amount,
    p_method: method,
    p_notes: notes
  });
  if (error) throw new Error(error.message);
  return data as Payable;
}

// ─── Commissions ──────────────────────────────────────────
export async function createCommission(orgId: string, input: CommissionInput): Promise<Commission> {
  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('fin_commissions')
    .insert({
      organization_id: orgId,
      beneficiary_id: input.beneficiary_id,
      invoice_id: input.invoice_id ?? null,
      case_id: input.case_id ?? null,
      base_amount: input.base_amount,
      percentage: input.percentage,
      amount: input.amount,
      reference_month: input.reference_month ?? null,
      notes: input.notes ?? null,
      created_by: userData.user?.id ?? null
    } as never)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Commission;
}

export async function transitionCommission(
  id: string,
  target: CommissionStatus
): Promise<Commission> {
  const supabase = createSupabaseServerClient();
  const patch: Record<string, unknown> = { status: target };
  const now = new Date().toISOString();
  if (target === 'approved') patch.approved_at = now;
  if (target === 'paid') patch.paid_at = now;

  const { data, error } = await supabase
    .from('fin_commissions')
    .update(patch as never)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  const commission = data as Commission;
  if (target === 'paid') {
    // Register expense txn
    await supabase.from('fin_transactions').insert({
      organization_id: commission.organization_id,
      kind: 'expense',
      amount: commission.amount,
      description: 'Comissão paga',
      source_type: 'commission',
      source_id: commission.id
    } as never);
  }
  return commission;
}

export async function deleteCommission(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('fin_commissions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
