'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { leadSchema, extractLeadForm } from '@/lib/validations/leads';
import { CUSTOMER_STATUSES, type CustomerStatus } from '@/lib/validations/dentists';

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

// ─── Drag-drop: update stage ─────────────────────────────────
export async function updateLeadStageAction(leadId: string, newStage: string) {
  if (!CUSTOMER_STATUSES.includes(newStage as CustomerStatus)) {
    throw new Error(`Invalid stage: ${newStage}`);
  }
  const { supabase } = await requireCommercial();

  // Log activity when stage changes
  const { data: existing } = await supabase
    .from('leads')
    .select('pipeline_stage, organization_id')
    .eq('id', leadId)
    .maybeSingle<{ pipeline_stage: string; organization_id: string }>();

  const { error } = await supabase
    .from('leads')
    .update({ pipeline_stage: newStage } as never)
    .eq('id', leadId);
  if (error) throw new Error(error.message);

  if (existing && existing.pipeline_stage !== newStage) {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    await supabase.from('lead_activities').insert({
      organization_id: existing.organization_id,
      lead_id: leadId,
      user_id: user?.id ?? null,
      activity_type: 'stage_change',
      title: `Etapa alterada: ${existing.pipeline_stage} → ${newStage}`,
      completed_at: new Date().toISOString()
    } as never);
  }

  revalidatePath('/leads');
}

// ─── Convert lead → dentist ──────────────────────────────────
export async function convertLeadToDentistAction(leadId: string) {
  const { supabase, user, profile } = await requireCommercial();

  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .maybeSingle();
  if (leadErr) throw new Error(leadErr.message);
  if (!lead) throw new Error('Lead não encontrado.');

  const l = lead as {
    id: string; full_name: string; cro_number: string | null; cro_state: string | null;
    specialty: string | null; email: string | null; phone: string | null;
    whatsapp: string | null; instagram: string | null; city: string | null;
    state: string | null; source: string | null; commercial_owner_id: string | null;
    notes: string | null; converted_dentist_id: string | null;
  };

  if (l.converted_dentist_id) {
    // Already converted — redirect to dentist
    redirect(`/dentistas/${l.converted_dentist_id}`);
  }

  const { data: dentist, error: dErr } = await supabase
    .from('dentists')
    .insert({
      organization_id: profile.organization_id,
      full_name: l.full_name,
      cro_number: l.cro_number,
      cro_state: l.cro_state,
      specialty: l.specialty,
      email: l.email,
      phone: l.phone,
      whatsapp: l.whatsapp,
      instagram: l.instagram,
      city: l.city,
      state: l.state,
      source: l.source,
      commercial_owner_id: l.commercial_owner_id,
      customer_status: 'first_case',
      notes: l.notes,
      created_by: user.id
    } as never)
    .select('id')
    .single<{ id: string }>();
  if (dErr) throw new Error(dErr.message);

  const { error: linkErr } = await supabase
    .from('leads')
    .update({
      converted_dentist_id: dentist!.id,
      converted_at: new Date().toISOString(),
      pipeline_stage: 'first_case'
    } as never)
    .eq('id', leadId);
  if (linkErr) throw new Error(linkErr.message);

  await supabase.from('lead_activities').insert({
    organization_id: profile.organization_id,
    lead_id: leadId,
    user_id: user.id,
    activity_type: 'converted',
    title: 'Lead convertido em dentista',
    completed_at: new Date().toISOString()
  } as never);

  revalidatePath('/leads');
  revalidatePath('/dentistas');
  redirect(`/dentistas/${dentist!.id}`);
}

// ─── Update lead (generic) ───────────────────────────────────
export async function updateLeadAction(
  id: string,
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const raw = extractLeadForm(formData);
  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  const { supabase } = await requireCommercial();
  const { error } = await supabase.from('leads').update({
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
  } as never).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/leads');
  revalidatePath(`/leads/${id}`);
  return { ok: true, id };
}

export async function archiveLeadAction(id: string) {
  const { supabase } = await requireCommercial();
  const { error } = await supabase
    .from('leads')
    .update({ archived_at: new Date().toISOString() } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/leads');
  redirect('/leads');
}
