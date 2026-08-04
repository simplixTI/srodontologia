'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ActionState = { ok: boolean; error?: string };

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
  const total = Number(formData.get('total') ?? 0);
  const payment_terms = String(formData.get('payment_terms') ?? '').trim() || null;
  const validity_date = String(formData.get('validity_date') ?? '').trim() || null;
  const estimated_days = formData.get('estimated_days') ? Number(formData.get('estimated_days')) : null;
  const public_notes = String(formData.get('public_notes') ?? '').trim() || null;

  if (total < 0) return { ok: false, error: 'Total inválido.' };

  const { supabase, user, profile } = await requireFinance();

  // Get next version number for this case
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
    subtotal: total,
    discount: 0,
    shipping_cost: 0,
    total,
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
