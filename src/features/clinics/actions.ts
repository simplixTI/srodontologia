'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { clinicSchema, extractClinicForm } from '@/lib/validations/clinics';

export type ActionState = { ok: boolean; error?: string; id?: string };

async function requireCommercial() {
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
  if (!['super_admin', 'admin', 'commercial'].includes(profile.role))
    throw new Error('Forbidden');

  return { supabase, user, profile };
}

function toNullable(v: string) {
  return v && v.trim().length > 0 ? v.trim() : null;
}

export async function createClinicAction(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const parsed = clinicSchema.safeParse(extractClinicForm(formData));
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  try {
    const { supabase, user, profile } = await requireCommercial();
    const { data, error } = await supabase
      .from('clinics')
      .insert({
        organization_id: profile.organization_id,
        trade_name: parsed.data.trade_name.trim(),
        legal_name: toNullable(parsed.data.legal_name ?? ''),
        document: toNullable(parsed.data.document ?? ''),
        email: toNullable(parsed.data.email ?? ''),
        phone: toNullable(parsed.data.phone ?? ''),
        whatsapp: toNullable(parsed.data.whatsapp ?? ''),
        address_line: toNullable(parsed.data.address_line ?? ''),
        address_number: toNullable(parsed.data.address_number ?? ''),
        address_complement: toNullable(parsed.data.address_complement ?? ''),
        neighborhood: toNullable(parsed.data.neighborhood ?? ''),
        city: toNullable(parsed.data.city ?? ''),
        state: toNullable(parsed.data.state ?? ''),
        zip_code: toNullable(parsed.data.zip_code ?? ''),
        financial_contact_name: toNullable(parsed.data.financial_contact_name ?? ''),
        financial_contact_email: toNullable(parsed.data.financial_contact_email ?? ''),
        financial_contact_phone: toNullable(parsed.data.financial_contact_phone ?? ''),
        payment_terms: toNullable(parsed.data.payment_terms ?? ''),
        notes: toNullable(parsed.data.notes ?? ''),
        active: parsed.data.active,
        created_by: user.id
      } as never)
      .select('id')
      .single<{ id: string }>();

    if (error) return { ok: false, error: error.message };

    revalidatePath('/clinicas');
    redirect(`/clinicas/${data!.id}`);
  } catch (e) {
    if (e instanceof Error && !e.message.includes('NEXT_REDIRECT'))
      return { ok: false, error: e.message };
    throw e;
  }
  return { ok: true };
}

export async function updateClinicAction(
  id: string,
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const parsed = clinicSchema.safeParse(extractClinicForm(formData));
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  const { supabase } = await requireCommercial();
  const { error } = await supabase
    .from('clinics')
    .update({
      trade_name: parsed.data.trade_name.trim(),
      legal_name: toNullable(parsed.data.legal_name ?? ''),
      document: toNullable(parsed.data.document ?? ''),
      email: toNullable(parsed.data.email ?? ''),
      phone: toNullable(parsed.data.phone ?? ''),
      whatsapp: toNullable(parsed.data.whatsapp ?? ''),
      address_line: toNullable(parsed.data.address_line ?? ''),
      address_number: toNullable(parsed.data.address_number ?? ''),
      address_complement: toNullable(parsed.data.address_complement ?? ''),
      neighborhood: toNullable(parsed.data.neighborhood ?? ''),
      city: toNullable(parsed.data.city ?? ''),
      state: toNullable(parsed.data.state ?? ''),
      zip_code: toNullable(parsed.data.zip_code ?? ''),
      financial_contact_name: toNullable(parsed.data.financial_contact_name ?? ''),
      financial_contact_email: toNullable(parsed.data.financial_contact_email ?? ''),
      financial_contact_phone: toNullable(parsed.data.financial_contact_phone ?? ''),
      payment_terms: toNullable(parsed.data.payment_terms ?? ''),
      notes: toNullable(parsed.data.notes ?? ''),
      active: parsed.data.active
    } as never)
    .eq('id', id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/clinicas');
  revalidatePath(`/clinicas/${id}`);
  return { ok: true, id };
}

export async function archiveClinicAction(id: string) {
  const { supabase } = await requireCommercial();
  const { error } = await supabase
    .from('clinics')
    .update({ archived_at: new Date().toISOString(), active: false } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/clinicas');
  redirect('/clinicas');
}
