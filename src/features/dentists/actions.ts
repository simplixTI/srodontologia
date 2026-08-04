'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { dentistSchema, extractDentistForm } from '@/lib/validations/dentists';

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

function payload(input: ReturnType<typeof extractDentistForm>) {
  return {
    full_name: input.full_name.trim(),
    primary_clinic_id: toNullable(input.primary_clinic_id),
    cpf: toNullable(input.cpf),
    cro_number: toNullable(input.cro_number),
    cro_state: toNullable(input.cro_state),
    specialty: toNullable(input.specialty),
    email: toNullable(input.email),
    phone: toNullable(input.phone),
    whatsapp: toNullable(input.whatsapp),
    instagram: toNullable(input.instagram),
    city: toNullable(input.city),
    state: toNullable(input.state),
    source: toNullable(input.source),
    commercial_owner_id: toNullable(input.commercial_owner_id),
    customer_status: input.customer_status,
    payment_terms: toNullable(input.payment_terms),
    notes: toNullable(input.notes),
    active: input.active
  };
}

export async function createDentistAction(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const raw = extractDentistForm(formData);
  const parsed = dentistSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  try {
    const { supabase, user, profile } = await requireCommercial();
    const p = payload(raw);
    const { data, error } = await supabase
      .from('dentists')
      .insert({
        organization_id: profile.organization_id,
        created_by: user.id,
        ...p
      } as never)
      .select('id')
      .single<{ id: string }>();
    if (error) return { ok: false, error: error.message };

    // Auto-link to clinic_dentists if primary_clinic_id given
    if (p.primary_clinic_id && data) {
      await supabase.from('clinic_dentists').insert({
        organization_id: profile.organization_id,
        clinic_id: p.primary_clinic_id,
        dentist_id: data.id,
        is_primary: true,
        active: true
      } as never);
    }

    revalidatePath('/dentistas');
    if (p.primary_clinic_id) revalidatePath(`/clinicas/${p.primary_clinic_id}`);
    redirect(`/dentistas/${data!.id}`);
  } catch (e) {
    if (e instanceof Error && !e.message.includes('NEXT_REDIRECT'))
      return { ok: false, error: e.message };
    throw e;
  }
  return { ok: true };
}

export async function updateDentistAction(
  id: string,
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const raw = extractDentistForm(formData);
  const parsed = dentistSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  const { supabase } = await requireCommercial();
  const p = payload(raw);
  const { error } = await supabase.from('dentists').update(p as never).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/dentistas');
  revalidatePath(`/dentistas/${id}`);
  if (p.primary_clinic_id) revalidatePath(`/clinicas/${p.primary_clinic_id}`);
  return { ok: true, id };
}

export async function archiveDentistAction(id: string) {
  const { supabase } = await requireCommercial();
  const { error } = await supabase
    .from('dentists')
    .update({ archived_at: new Date().toISOString(), active: false } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/dentistas');
  redirect('/dentistas');
}
