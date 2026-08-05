import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { TemplateInput } from '@/lib/validations/planning';
import type { PlanningTemplate, PlanningVersion } from './types';

// ─── Version ──────────────────────────────────────────────
export async function createVersion(
  orgId: string,
  userId: string,
  input: {
    case_id: string;
    technical_description?: string | null;
    template_id?: string | null;
    estimated_delivery_at?: string | null;
  }
): Promise<PlanningVersion> {
  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase
    .from('planning_versions')
    .select('version_number')
    .eq('case_id', input.case_id)
    .order('version_number', { ascending: false })
    .limit(1);
  const nextVersion = ((existing?.[0] as { version_number: number } | undefined)?.version_number ?? 0) + 1;

  const { data, error } = await supabase
    .from('planning_versions')
    .insert({
      organization_id: orgId,
      case_id: input.case_id,
      version_number: nextVersion,
      status: 'draft',
      technical_description: input.technical_description ?? null,
      template_id: input.template_id ?? null,
      estimated_delivery_at: input.estimated_delivery_at ?? null,
      created_by: userId
    } as never)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  const version = data as PlanningVersion;

  if (input.template_id) {
    await instantiateChecklistFromTemplate(version.id, input.template_id);
  }
  return version;
}

export async function updateVersionDescription(
  id: string,
  description: string | null
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('planning_versions')
    .update({ technical_description: description } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function transitionVersion(
  id: string,
  target: 'sent' | 'approved' | 'changes_requested' | 'obsolete',
  comment?: string | null
): Promise<PlanningVersion> {
  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: target };
  if (target === 'sent') patch.sent_at = now;
  if (target === 'sent' && !comment) patch.submitted_at = now;
  if (target === 'approved') patch.approved_at = now;

  const { data, error } = await supabase
    .from('planning_versions')
    .update(patch as never)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  // Audit
  const { data: v } = await supabase
    .from('planning_versions')
    .select('organization_id')
    .eq('id', id)
    .maybeSingle<{ organization_id: string }>();
  if (v) {
    await supabase.from('planning_actions').insert({
      organization_id: v.organization_id,
      planning_version_id: id,
      action: target,
      comment: comment ?? null
    } as never);
  }

  return data as PlanningVersion;
}

export async function instantiateChecklistFromTemplate(
  versionId: string,
  templateId: string
): Promise<number> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc('instantiate_planning_checklist', {
    p_version_id: versionId,
    p_template_id: templateId
  });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function promoteToProduction(versionId: string): Promise<string> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc('promote_planning_to_production', {
    p_version_id: versionId
  });
  if (error) throw new Error(error.message);
  return data as string;
}

// ─── Templates ────────────────────────────────────────────
export async function createTemplate(orgId: string, input: TemplateInput): Promise<PlanningTemplate> {
  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('planning_templates')
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
  return data as PlanningTemplate;
}

export async function updateTemplate(id: string, patch: Partial<TemplateInput>): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('planning_templates')
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

export async function deleteTemplate(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('planning_templates').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function addTemplateItem(
  orgId: string,
  templateId: string,
  label: string,
  description: string | null,
  position: number,
  is_required: boolean
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('planning_template_items').insert({
    organization_id: orgId,
    template_id: templateId,
    label: label.trim(),
    description: description ?? null,
    position,
    is_required
  } as never);
  if (error) throw new Error(error.message);
}

export async function removeTemplateItem(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('planning_template_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Checklist ────────────────────────────────────────────
export async function toggleChecklistItem(id: string, is_done: boolean, notes?: string | null): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const patch: Record<string, unknown> = { is_done, notes: notes ?? null };
  patch.done_by = is_done ? userData.user?.id ?? null : null;
  patch.done_at = is_done ? new Date().toISOString() : null;
  const { error } = await supabase
    .from('planning_checklist_items')
    .update(patch as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function addChecklistItem(
  orgId: string,
  versionId: string,
  label: string,
  is_required: boolean
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase
    .from('planning_checklist_items')
    .select('position')
    .eq('planning_version_id', versionId)
    .order('position', { ascending: false })
    .limit(1);
  const nextPos = ((existing?.[0] as { position: number } | undefined)?.position ?? -10) + 10;
  const { error } = await supabase.from('planning_checklist_items').insert({
    organization_id: orgId,
    planning_version_id: versionId,
    label: label.trim(),
    position: nextPos,
    is_required
  } as never);
  if (error) throw new Error(error.message);
}

export async function removeChecklistItem(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('planning_checklist_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Comments ─────────────────────────────────────────────
export async function addComment(
  orgId: string,
  versionId: string,
  body: string,
  is_internal: boolean
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('planning_comments').insert({
    organization_id: orgId,
    planning_version_id: versionId,
    author_id: userData.user?.id ?? null,
    body: body.trim(),
    is_internal
  } as never);
  if (error) throw new Error(error.message);
}
