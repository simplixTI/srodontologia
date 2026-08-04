'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { leadSchema, extractLeadForm } from '@/lib/validations/leads';

export type ActionState = { ok: boolean; error?: string; id?: string };

async function requireCommercial() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
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

export async function createLeadAction(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const raw = extractLeadForm(formData);
  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  try {
    const { supabase, user, profile } = await requireCommercial();
    const { data, error } = await supabase.from('leads').insert({
      organization_id: profile.organization_id,
      created_by: user.id,
      full_name: parsed.data.full_name.trim(),
      clinic_name: toNullable(parsed.data.clinic_name ?? ''),
      cro_number: toNullable(parsed.data.cro_number ?? ''),
      cro_state: toNullable(parsed.data.cro_state ?? ''),
      specialty: toNullable(parsed.data.specialty ?? ''),
      email: toNullable(parsed.data.email ?? ''),
      phone: toNullable(parsed.data.phone ?? ''),
      whatsapp: toNullable(parsed.data.whatsapp ?? ''),
      instagram: toNullable(parsed.data.instagram ?? ''),
      city: toNullable(parsed.data.city ?? ''),
      state: toNullable(parsed.data.state ?? ''),
      source: toNullable(parsed.data.source ?? ''),
      pipeline_stage: parsed.data.pipeline_stage,
      estimated_value: parsed.data.estimated_value ?? null,
      commercial_owner_id: toNullable(parsed.data.commercial_owner_id ?? ''),
      next_follow_up_at: parsed.data.next_follow_up_at
        ? new Date(parsed.data.next_follow_up_at).toISOString()
        : null,
      notes: toNullable(parsed.data.notes ?? '')
    } as never).select('id').single<{ id: string }>();

    if (error) return { ok: false, error: error.message };
    revalidatePath('/leads');
    redirect('/leads');
  } catch (e) {
    if (e instanceof Error && !e.message.includes('NEXT_REDIRECT'))
      return { ok: false, error: e.message };
    throw e;
  }
  return { ok: true };
}
