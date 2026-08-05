'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { publishEvent } from '@/lib/events';
import {
  extractQcChecklistForm,
  finalizeInspectionSchema,
  inspectionCreateSchema,
  inspectionItemUpdateSchema,
  qcChecklistItemSchema,
  qcChecklistSchema,
  type QcChecklistInput
} from '@/lib/validations/qc';
import {
  addChecklistItem,
  cancelInspection,
  createChecklist,
  createInspection,
  deleteChecklist,
  finalizeInspection,
  removeChecklistItem,
  updateChecklist,
  updateInspectionItem,
  updateOverallNotes
} from './service';

export type ActionState = { ok: boolean; error?: string; id?: string };

async function requireInternal() {
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
  if (
    !['super_admin', 'admin', 'technical_planning', 'production'].includes(profile.role)
  )
    throw new Error('Forbidden');
  return { userId: user.id, orgId: profile.organization_id };
}

// ─── Checklists ───────────────────────────────────────────
export async function createChecklistAction(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const raw = extractQcChecklistForm(formData);
  const parsed = qcChecklistSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  try {
    const { orgId } = await requireInternal();
    const c = await createChecklist(orgId, parsed.data);
    revalidatePath('/qualidade/templates');
    redirect(`/qualidade/templates/${c.id}`);
  } catch (e) {
    if (e instanceof Error && !e.message.includes('NEXT_REDIRECT'))
      return { ok: false, error: e.message };
    throw e;
  }
  return { ok: true };
}

export async function updateChecklistAction(id: string, patch: Partial<QcChecklistInput>): Promise<void> {
  await requireInternal();
  const parsed = qcChecklistSchema.partial().safeParse(patch);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  await updateChecklist(id, parsed.data);
  revalidatePath('/qualidade/templates');
  revalidatePath(`/qualidade/templates/${id}`);
}

export async function deleteChecklistAction(id: string): Promise<void> {
  await requireInternal();
  await deleteChecklist(id);
  revalidatePath('/qualidade/templates');
}

export async function addChecklistItemAction(input: {
  checklist_id: string;
  label: string;
  description?: string | null;
  is_critical?: boolean;
}): Promise<void> {
  const parsed = qcChecklistItemSchema.safeParse({
    checklist_id: input.checklist_id,
    label: input.label,
    description: input.description ?? null,
    position: 0,
    is_critical: input.is_critical ?? false
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  const { orgId } = await requireInternal();
  await addChecklistItem(
    orgId,
    parsed.data.checklist_id,
    parsed.data.label,
    parsed.data.description ?? null,
    parsed.data.is_critical
  );
  revalidatePath(`/qualidade/templates/${input.checklist_id}`);
}

export async function removeChecklistItemAction(id: string, checklistId: string): Promise<void> {
  await requireInternal();
  await removeChecklistItem(id);
  revalidatePath(`/qualidade/templates/${checklistId}`);
}

// ─── Inspections ──────────────────────────────────────────
export async function createInspectionAction(input: {
  case_id: string;
  production_card_id?: string | null;
  checklist_id?: string | null;
}): Promise<{ id: string }> {
  const parsed = inspectionCreateSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  const { userId, orgId } = await requireInternal();
  const id = await createInspection(parsed.data);
  await publishEvent({
    organizationId: orgId,
    type: 'production.card_created',
    aggregateType: 'qc_inspection',
    aggregateId: id,
    actorId: userId,
    payload: { via: 'qc_inspection_created', case_id: parsed.data.case_id }
  });
  revalidatePath('/qualidade');
  return { id };
}

export async function updateInspectionItemAction(input: {
  item_id: string;
  result: 'pending' | 'pass' | 'fail' | 'na';
  reason?: string | null;
  notes?: string | null;
}): Promise<void> {
  const parsed = inspectionItemUpdateSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  await requireInternal();
  await updateInspectionItem(
    parsed.data.item_id,
    parsed.data.result,
    parsed.data.reason ?? null,
    parsed.data.notes ?? null
  );
  revalidatePath('/qualidade');
}

export async function updateOverallNotesAction(id: string, notes: string | null): Promise<void> {
  await requireInternal();
  await updateOverallNotes(id, notes);
}

export async function finalizeInspectionAction(input: {
  inspection_id: string;
  rework_stage_id?: string | null;
  overall_notes?: string | null;
}): Promise<'passed' | 'failed'> {
  const parsed = finalizeInspectionSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  const { userId, orgId } = await requireInternal();
  if (parsed.data.overall_notes !== undefined) {
    await updateOverallNotes(parsed.data.inspection_id, parsed.data.overall_notes ?? null);
  }
  const inspection = await finalizeInspection(
    parsed.data.inspection_id,
    parsed.data.rework_stage_id ?? null
  );
  await publishEvent({
    organizationId: orgId,
    type: inspection.status === 'failed' ? 'production.rework_flagged' : 'production.stage_changed',
    aggregateType: 'qc_inspection',
    aggregateId: inspection.id,
    actorId: userId,
    payload: { status: inspection.status, case_id: inspection.case_id }
  });
  revalidatePath('/qualidade');
  revalidatePath('/producao');
  return inspection.status === 'failed' ? 'failed' : 'passed';
}

export async function cancelInspectionAction(id: string): Promise<void> {
  await requireInternal();
  await cancelInspection(id);
  revalidatePath('/qualidade');
}
