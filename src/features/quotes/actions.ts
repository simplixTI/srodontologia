'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ActionState = { ok: boolean; error?: string; id?: string };

async function requireFinance() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string; role: string }>();
  if (!profile) throw new Error('No profile');
  const allowed = ['super_admin', 'admin', 'commercial', 'finance'];
  if (!allowed.includes(profile.role)) throw new Error('Forbidden');
  return { supabase, user, profile };
}

export async function createQuoteAction(caseId: string, formData: FormData): Promise<ActionState> {
  const payment_terms = String(formData.get('payment_terms') ?? '').trim() || null;
  const validity_date = String(formData.get('validity_date') ?? '').trim() || null;
  const estimated_days = formData.get('estimated_days') ? Number(formData.get('estimated_days')) : null;
  const public_notes = String(formData.get('public_notes') ?? '').trim() || null;

  const { supabase, user, profile } = await requireFinance();

  const { data: existing } = await supabase
    .from('quotes')
    .select('version_number')
    .eq('case_id', caseId)
    .order('version_number', { ascending: false })
    .limit(1);
  const nextVersion = ((existing?.[0] as { version_number: number } | undefined)?.version_number ?? 0) + 1;

  const { error } = await supabase.from('quotes').insert({
    organization_id: profile.organization_id,
    case_id: caseId,
    version_number: nextVersion,
    status: 'draft',
    subtotal: 0,
    discount: 0,
    shipping_cost: 0,
    total: 0,
    payment_terms,
    validity_date,
    estimated_days,
    public_notes,
    created_by: user.id
  } as never);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/casos/${caseId}`);
  return { ok: true };
}

async function recalculateQuoteTotal(quoteId: string) {
  const { supabase } = await requireFinance();
  const { data: items } = await supabase
    .from('quote_items')
    .select('quantity, unit_price, discount')
    .eq('quote_id', quoteId);
  const rows = (items ?? []) as { quantity: number; unit_price: number; discount: number }[];
  const subtotal = rows.reduce((s, r) => s + Number(r.quantity) * Number(r.unit_price), 0);
  const discount = rows.reduce((s, r) => s + Number(r.discount ?? 0), 0);
  const total = subtotal - discount;
  await supabase
    .from('quotes')
    .update({ subtotal, discount, total } as never)
    .eq('id', quoteId);
  return total;
}

export async function addQuoteItemAction(
  quoteId: string,
  caseId: string,
  formData: FormData
): Promise<ActionState> {
  const description = String(formData.get('description') ?? '').trim();
  const quantity = Number(formData.get('quantity') ?? 1);
  const unit_price = Number(formData.get('unit_price') ?? 0);
  const discount = Number(formData.get('discount') ?? 0);

  if (!description) return { ok: false, error: 'Descrição obrigatória.' };
  if (quantity <= 0) return { ok: false, error: 'Quantidade deve ser positiva.' };
  if (unit_price < 0) return { ok: false, error: 'Valor unitário inválido.' };

  const total = quantity * unit_price - discount;

  const { supabase, profile } = await requireFinance();

  // Guard: don't touch approved quotes
  const { data: q } = await supabase.from('quotes').select('status').eq('id', quoteId).maybeSingle<{ status: string }>();
  if (q?.status === 'approved') return { ok: false, error: 'Orçamento aprovado é imutável.' };

  const { data: existing } = await supabase
    .from('quote_items')
    .select('sort_order')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: false })
    .limit(1);
  const nextOrder = ((existing?.[0] as { sort_order: number } | undefined)?.sort_order ?? 0) + 10;

  const { error } = await supabase.from('quote_items').insert({
    organization_id: profile.organization_id,
    quote_id: quoteId,
    description,
    quantity,
    unit_price,
    discount,
    total,
    sort_order: nextOrder
  } as never);
  if (error) return { ok: false, error: error.message };

  await recalculateQuoteTotal(quoteId);
  revalidatePath(`/casos/${caseId}`);
  return { ok: true };
}

export async function deleteQuoteItemAction(
  itemId: string,
  quoteId: string,
  caseId: string
) {
  const { supabase } = await requireFinance();
  const { data: q } = await supabase.from('quotes').select('status').eq('id', quoteId).maybeSingle<{ status: string }>();
  if (q?.status === 'approved') throw new Error('Orçamento aprovado é imutável.');

  const { error } = await supabase.from('quote_items').delete().eq('id', itemId);
  if (error) throw new Error(error.message);
  await recalculateQuoteTotal(quoteId);
  revalidatePath(`/casos/${caseId}`);
}

export async function approveQuoteInternalAction(quoteId: string, caseId: string) {
  const { supabase } = await requireFinance();
  const { data: q } = await supabase.from('quotes').select('status').eq('id', quoteId).maybeSingle<{ status: string }>();
  if (q?.status === 'approved') throw new Error('Já aprovado.');

  const { error } = await supabase
    .from('quotes')
    .update({ status: 'approved', approved_at: new Date().toISOString() } as never)
    .eq('id', quoteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/casos/${caseId}`);
}

export async function rejectQuoteAction(quoteId: string, caseId: string) {
  const { supabase } = await requireFinance();
  const { error } = await supabase
    .from('quotes')
    .update({ status: 'rejected', rejected_at: new Date().toISOString() } as never)
    .eq('id', quoteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/casos/${caseId}`);
}

export async function markQuoteSentAction(quoteId: string, caseId: string) {
  const { supabase } = await requireFinance();
  const { error } = await supabase
    .from('quotes')
    .update({ status: 'sent', sent_at: new Date().toISOString() } as never)
    .eq('id', quoteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/casos/${caseId}`);
}

/** Creates a new version copying items from a source quote. */
export async function duplicateQuoteAction(quoteId: string, caseId: string): Promise<ActionState> {
  const { supabase, user, profile } = await requireFinance();

  const { data: src } = await supabase.from('quotes').select('*').eq('id', quoteId).maybeSingle();
  if (!src) return { ok: false, error: 'Orçamento não encontrado.' };
  const s = src as {
    payment_terms: string | null;
    validity_date: string | null;
    estimated_days: number | null;
    public_notes: string | null;
    shipping_cost: number;
  };

  const { data: existing } = await supabase
    .from('quotes')
    .select('version_number')
    .eq('case_id', caseId)
    .order('version_number', { ascending: false })
    .limit(1);
  const nextVersion = ((existing?.[0] as { version_number: number } | undefined)?.version_number ?? 0) + 1;

  const { data: newQ, error } = await supabase
    .from('quotes')
    .insert({
      organization_id: profile.organization_id,
      case_id: caseId,
      version_number: nextVersion,
      status: 'draft',
      subtotal: 0,
      discount: 0,
      shipping_cost: s.shipping_cost ?? 0,
      total: 0,
      payment_terms: s.payment_terms,
      validity_date: s.validity_date,
      estimated_days: s.estimated_days,
      public_notes: s.public_notes,
      created_by: user.id
    } as never)
    .select('id')
    .single<{ id: string }>();
  if (error) return { ok: false, error: error.message };

  const { data: srcItems } = await supabase
    .from('quote_items')
    .select('description, quantity, unit_price, discount, total, sort_order')
    .eq('quote_id', quoteId);

  const rows = (srcItems ?? []) as {
    description: string; quantity: number; unit_price: number;
    discount: number; total: number; sort_order: number;
  }[];

  if (rows.length > 0) {
    await supabase.from('quote_items').insert(
      rows.map((r) => ({ ...r, organization_id: profile.organization_id, quote_id: newQ!.id })) as never
    );
    await recalculateQuoteTotal(newQ!.id);
  }

  revalidatePath(`/casos/${caseId}`);
  return { ok: true, id: newQ!.id };
}
