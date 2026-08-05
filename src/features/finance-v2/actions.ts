'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  categorySchema,
  commissionSchema,
  commissionTransitionSchema,
  costCenterSchema,
  extractCategoryForm,
  extractCostCenterForm,
  extractPayableForm,
  payableSchema,
  payPayableSchema,
  type CategoryInput,
  type CommissionInput,
  type CostCenterInput,
  type PayableInput
} from '@/lib/validations/finance-v2';
import {
  createCategory,
  createCommission,
  createCostCenter,
  createPayable,
  deleteCategory,
  deleteCommission,
  deleteCostCenter,
  deletePayable,
  payPayable,
  transitionCommission,
  updateCategory,
  updateCostCenter,
  updatePayable
} from './service';
import type { CommissionStatus, PaymentMethod } from './types';

export type ActionState = { ok: boolean; error?: string; id?: string };

async function requireFinance() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string; role: string }>();
  if (!profile) throw new Error('No profile');
  if (!['super_admin', 'admin', 'finance'].includes(profile.role)) throw new Error('Forbidden');
  return { userId: user.id, orgId: profile.organization_id };
}

// ─── Category actions ────────────────────────────────────
export async function createCategoryAction(
  _prev: ActionState | undefined,
  fd: FormData
): Promise<ActionState> {
  const raw = extractCategoryForm(fd);
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  try {
    const { orgId } = await requireFinance();
    await createCategory(orgId, parsed.data);
    revalidatePath('/financeiro/categorias');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateCategoryAction(id: string, patch: Partial<CategoryInput>): Promise<void> {
  await requireFinance();
  const parsed = categorySchema.partial().safeParse(patch);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  await updateCategory(id, parsed.data);
  revalidatePath('/financeiro/categorias');
}

export async function deleteCategoryAction(id: string): Promise<void> {
  await requireFinance();
  await deleteCategory(id);
  revalidatePath('/financeiro/categorias');
}

// ─── Cost center actions ─────────────────────────────────
export async function createCostCenterAction(
  _prev: ActionState | undefined,
  fd: FormData
): Promise<ActionState> {
  const raw = extractCostCenterForm(fd);
  const parsed = costCenterSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  try {
    const { orgId } = await requireFinance();
    await createCostCenter(orgId, parsed.data);
    revalidatePath('/financeiro/centros-custo');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateCostCenterAction(id: string, patch: Partial<CostCenterInput>): Promise<void> {
  await requireFinance();
  const parsed = costCenterSchema.partial().safeParse(patch);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  await updateCostCenter(id, parsed.data);
  revalidatePath('/financeiro/centros-custo');
}

export async function deleteCostCenterAction(id: string): Promise<void> {
  await requireFinance();
  await deleteCostCenter(id);
  revalidatePath('/financeiro/centros-custo');
}

// ─── Payable actions ─────────────────────────────────────
export async function createPayableAction(
  _prev: ActionState | undefined,
  fd: FormData
): Promise<ActionState> {
  const raw = extractPayableForm(fd);
  const parsed = payableSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  try {
    const { orgId } = await requireFinance();
    const p = await createPayable(orgId, parsed.data);
    revalidatePath('/financeiro/pagar');
    redirect(`/financeiro/pagar/${p.id}`);
  } catch (e) {
    if (e instanceof Error && !e.message.includes('NEXT_REDIRECT'))
      return { ok: false, error: e.message };
    throw e;
  }
  return { ok: true };
}

export async function updatePayableAction(id: string, patch: Partial<PayableInput>): Promise<void> {
  await requireFinance();
  const parsed = payableSchema.partial().safeParse(patch);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  await updatePayable(id, parsed.data);
  revalidatePath('/financeiro/pagar');
  revalidatePath(`/financeiro/pagar/${id}`);
}

export async function deletePayableAction(id: string): Promise<void> {
  await requireFinance();
  await deletePayable(id);
  revalidatePath('/financeiro/pagar');
}

export async function payPayableAction(input: {
  payable_id: string;
  paid_amount: number;
  method: PaymentMethod;
  notes?: string | null;
}): Promise<void> {
  const parsed = payPayableSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  await requireFinance();
  await payPayable(
    parsed.data.payable_id,
    parsed.data.paid_amount,
    parsed.data.method,
    parsed.data.notes ?? null
  );
  revalidatePath('/financeiro/pagar');
  revalidatePath(`/financeiro/pagar/${parsed.data.payable_id}`);
  revalidatePath('/financeiro');
}

// ─── Commission actions ──────────────────────────────────
export async function createCommissionAction(input: CommissionInput): Promise<{ id: string }> {
  const parsed = commissionSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  const { orgId } = await requireFinance();
  const c = await createCommission(orgId, parsed.data);
  revalidatePath('/financeiro/comissoes');
  return { id: c.id };
}

export async function transitionCommissionAction(input: {
  commission_id: string;
  target: 'approved' | 'paid' | 'cancelled';
}): Promise<void> {
  const parsed = commissionTransitionSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  await requireFinance();
  await transitionCommission(parsed.data.commission_id, parsed.data.target as CommissionStatus);
  revalidatePath('/financeiro/comissoes');
  revalidatePath('/financeiro');
}

export async function deleteCommissionAction(id: string): Promise<void> {
  await requireFinance();
  await deleteCommission(id);
  revalidatePath('/financeiro/comissoes');
}
