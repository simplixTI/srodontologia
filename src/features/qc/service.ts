import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { QcChecklistInput } from '@/lib/validations/qc';
import type { QcChecklist, QcInspection, QcItemResult } from './types';

// ─── Checklists ───────────────────────────────────────────
export async function createChecklist(orgId: string, input: QcChecklistInput): Promise<QcChecklist> {
  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('qc_checklists')
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      description: input.description ?? null,
      case_type_id: input.case_type_id ?? null,
      is_default: input.is_default,
      is_active: input.is_active,
      created_by: userData.user?.id ?? null
    } as never)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as QcChecklist;
}

export async function updateChecklist(id: string, patch: Partial<QcChecklistInput>): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('qc_checklists')
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description ?? null } : {}),
      ...(patch.case_type_id !== undefined ? { case_type_id: patch.case_type_id ?? null } : {}),
      ...(patch.is_default !== undefined ? { is_default: patch.is_default } : {}),
      ...(patch.is_active !== undefined ? { is_active: patch.is_active } : {})
    } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteChecklist(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('qc_checklists').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function addChecklistItem(
  orgId: string,
  checklistId: string,
  label: string,
  description: string | null,
  is_critical: boolean
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase
    .from('qc_checklist_items')
    .select('position')
    .eq('checklist_id', checklistId)
    .order('position', { ascending: false })
    .limit(1);
  const nextPos = ((existing?.[0] as { position: number } | undefined)?.position ?? -10) + 10;
  const { error } = await supabase.from('qc_checklist_items').insert({
    organization_id: orgId,
    checklist_id: checklistId,
    label: label.trim(),
    description: description ?? null,
    position: nextPos,
    is_critical
  } as never);
  if (error) throw new Error(error.message);
}

export async function removeChecklistItem(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('qc_checklist_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Inspections ──────────────────────────────────────────
export async function createInspection(input: {
  case_id: string;
  production_card_id?: string | null;
  checklist_id?: string | null;
}): Promise<string> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc('instantiate_qc_inspection', {
    p_case_id: input.case_id,
    p_card_id: input.production_card_id ?? null,
    p_checklist_id: input.checklist_id ?? null
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function updateInspectionItem(
  itemId: string,
  result: QcItemResult,
  reason: string | null,
  notes: string | null
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('qc_inspection_items')
    .update({
      result,
      reason,
      notes,
      answered_by: userData.user?.id ?? null,
      answered_at: new Date().toISOString()
    } as never)
    .eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function updateOverallNotes(id: string, notes: string | null): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('qc_inspections')
    .update({ overall_notes: notes } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function finalizeInspection(
  inspectionId: string,
  reworkStageId: string | null
): Promise<QcInspection> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc('finalize_qc_inspection', {
    p_inspection_id: inspectionId,
    p_rework_stage_id: reworkStageId
  });
  if (error) throw new Error(error.message);
  return data as QcInspection;
}

export async function cancelInspection(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('qc_inspections')
    .update({ status: 'cancelled', finished_at: new Date().toISOString() } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
}
