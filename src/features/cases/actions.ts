'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createCaseSchema, updateCaseSchema } from '@/lib/validations/cases';
import { assertWithinLimit, incrementUsage } from '@/lib/limits/enforcement';

export type ActionState = { ok: boolean; error?: string; id?: string };

async function requireInternal() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string; role: string }>();
  if (!profile) throw new Error('No profile');
  const allowed = ['super_admin', 'admin', 'commercial', 'technical_planning', 'production'];
  if (!allowed.includes(profile.role)) throw new Error('Forbidden');
  return { supabase, user, profile };
}

export async function createCaseAction(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    dentist_id: formData.get('dentist_id')?.toString() ?? '',
    clinic_id: formData.get('clinic_id')?.toString() ?? '',
    case_type_id: formData.get('case_type_id')?.toString() ?? '',
    title: formData.get('title')?.toString() ?? ''
  };
  const parsed = createCaseSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  try {
    const { supabase, user, profile } = await requireInternal();

    // Plan enforcement: cases_month limit
    await assertWithinLimit(profile.organization_id, 'cases_month');

    const { data, error } = await supabase
      .from('cases')
      .insert({
        organization_id: profile.organization_id,
        dentist_id: parsed.data.dentist_id,
        clinic_id: parsed.data.clinic_id || null,
        case_type_id: parsed.data.case_type_id || null,
        title: parsed.data.title.trim(),
        internal_status: 'draft',
        created_by: user.id
      } as never)
      .select('id, case_type_id')
      .single<{ id: string; case_type_id: string | null }>();

    if (error) return { ok: false, error: error.message };

    // Track usage (fire-and-forget errors are ok — counter drift is corrected by next tick)
    await incrementUsage(profile.organization_id, 'cases_month', 1);

    // Instantiate checklist if case type set
    if (data?.case_type_id) {
      await supabase.rpc('instantiate_case_checklist', { p_case_id: data.id });
    }
    // Refresh health score
    if (data?.id) {
      await supabase.rpc('refresh_case_health_score', { p_case_id: data.id });
    }

    revalidatePath('/casos');
    redirect(`/casos/${data!.id}`);
  } catch (e) {
    if (e instanceof Error && !e.message.includes('NEXT_REDIRECT'))
      return { ok: false, error: e.message };
    throw e;
  }
  return { ok: true };
}

// Autosave: partial update, returns quickly, no redirect
export async function autosaveCaseAction(
  caseId: string,
  patch: Record<string, unknown>
): Promise<ActionState> {
  const parsed = updateCaseSchema.safeParse(patch);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  const { supabase } = await requireInternal();

  // Detect case_type change so we can instantiate checklist
  let previousCaseType: string | null = null;
  if ('case_type_id' in parsed.data) {
    const { data: existing } = await supabase
      .from('cases')
      .select('case_type_id')
      .eq('id', caseId)
      .maybeSingle<{ case_type_id: string | null }>();
    previousCaseType = existing?.case_type_id ?? null;
  }

  const patchToPersist: Record<string, unknown> = { ...parsed.data };
  // Normalize empty strings to null for date fields
  for (const k of ['requested_delivery_date', 'estimated_delivery_date'] as const) {
    if (patchToPersist[k] === '') patchToPersist[k] = null;
  }

  const { error } = await supabase
    .from('cases')
    .update(patchToPersist as never)
    .eq('id', caseId);
  if (error) return { ok: false, error: error.message };

  // If case_type changed, re-instantiate checklist (only if empty)
  if ('case_type_id' in parsed.data && parsed.data.case_type_id && parsed.data.case_type_id !== previousCaseType) {
    // Wipe existing checklist items so new instantiation works (instantiate is no-op if items exist)
    if (previousCaseType) {
      await supabase.from('case_checklist_items').delete().eq('case_id', caseId);
    }
    await supabase.rpc('instantiate_case_checklist', { p_case_id: caseId });
  }
  await supabase.rpc('refresh_case_health_score', { p_case_id: caseId });

  revalidatePath(`/casos/${caseId}`);
  return { ok: true, id: caseId };
}

export async function submitCaseAction(caseId: string) {
  const { supabase } = await requireInternal();

  // Get case + missing items
  const { data: caseRow } = await supabase
    .from('cases')
    .select('missing_required_items_count, internal_status')
    .eq('id', caseId)
    .maybeSingle<{ missing_required_items_count: number; internal_status: string }>();

  if (!caseRow) throw new Error('Caso não encontrado.');
  if (caseRow.internal_status !== 'draft') {
    throw new Error('Este caso já foi enviado.');
  }
  if (caseRow.missing_required_items_count > 0) {
    throw new Error(
      `Faltam ${caseRow.missing_required_items_count} itens obrigatórios para enviar.`
    );
  }

  const { error } = await supabase
    .from('cases')
    .update({
      internal_status: 'submitted',
      submitted_at: new Date().toISOString()
    } as never)
    .eq('id', caseId);
  if (error) throw new Error(error.message);

  revalidatePath('/casos');
  revalidatePath(`/casos/${caseId}`);
}

export async function toggleChecklistItemAction(
  itemId: string,
  caseId: string,
  completed: boolean
) {
  const { supabase, user } = await requireInternal();
  const { error } = await supabase
    .from('case_checklist_items')
    .update({
      completed,
      status: completed ? 'completed' : 'pending',
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? user.id : null
    } as never)
    .eq('id', itemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/casos/${caseId}`);
}

export async function archiveCaseAction(id: string) {
  const { supabase } = await requireInternal();
  const { error } = await supabase
    .from('cases')
    .update({ archived_at: new Date().toISOString() } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/casos');
  redirect('/casos');
}
