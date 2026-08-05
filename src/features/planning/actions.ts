'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { publishEvent } from '@/lib/events';
import {
  versionCreateSchema,
  transitionSchema,
  templateSchema,
  templateItemSchema,
  extractTemplateForm,
  checklistItemAddSchema,
  checklistItemToggleSchema,
  commentSchema
} from '@/lib/validations/planning';
import {
  addChecklistItem,
  addComment,
  addTemplateItem,
  createTemplate,
  createVersion,
  deleteTemplate,
  promoteToProduction,
  removeChecklistItem,
  removeTemplateItem,
  toggleChecklistItem,
  transitionVersion,
  updateTemplate,
  updateVersionDescription
} from './service';

export type ActionState = { ok: boolean; error?: string; id?: string };

type Session = {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  userId: string;
  orgId: string;
  role: string;
};

async function requireInternal(): Promise<Session> {
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
  if (profile.role === 'dentist') throw new Error('Forbidden');
  return { supabase, userId: user.id, orgId: profile.organization_id, role: profile.role };
}

async function requireTechnical(): Promise<Session> {
  const s = await requireInternal();
  if (!['super_admin', 'admin', 'technical_planning'].includes(s.role)) throw new Error('Forbidden');
  return s;
}

// ─── Version actions ─────────────────────────────────────
export async function createVersionAction(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    case_id: formData.get('case_id'),
    technical_description: formData.get('technical_description') || null,
    template_id: formData.get('template_id') || null,
    estimated_delivery_at: formData.get('estimated_delivery_at') || null
  };
  const parsed = versionCreateSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  try {
    const { orgId, userId } = await requireTechnical();
    const version = await createVersion(orgId, userId, parsed.data);
    await publishEvent({
      organizationId: orgId,
      type: 'planning.created',
      aggregateType: 'planning_version',
      aggregateId: version.id,
      actorId: userId,
      payload: { case_id: version.case_id, version: version.version_number }
    });
    revalidatePath(`/casos/${version.case_id}`);
    revalidatePath('/planejamento');
    return { ok: true, id: version.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateVersionDescriptionAction(
  versionId: string,
  description: string
): Promise<void> {
  await requireTechnical();
  await updateVersionDescription(versionId, description.trim() || null);
  revalidatePath('/planejamento');
}

export async function transitionVersionAction(input: {
  version_id: string;
  target: 'sent' | 'approved' | 'changes_requested' | 'obsolete';
  comment?: string | null;
}): Promise<void> {
  const parsed = transitionSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  const { orgId, userId } = await requireTechnical();
  const version = await transitionVersion(
    parsed.data.version_id,
    parsed.data.target,
    parsed.data.comment ?? null
  );
  const eventType =
    parsed.data.target === 'approved'
      ? 'planning.approved'
      : parsed.data.target === 'changes_requested'
        ? 'planning.changes_requested'
        : 'planning.sent';
  await publishEvent({
    organizationId: orgId,
    type: eventType,
    aggregateType: 'planning_version',
    aggregateId: version.id,
    actorId: userId,
    payload: { target: parsed.data.target, comment: parsed.data.comment ?? null }
  });
  revalidatePath(`/casos/${version.case_id}`);
  revalidatePath('/planejamento');
}

export async function promoteToProductionAction(versionId: string): Promise<{ card_id: string }> {
  const { orgId, userId } = await requireTechnical();
  const cardId = await promoteToProduction(versionId);
  await publishEvent({
    organizationId: orgId,
    type: 'production.card_created',
    aggregateType: 'production_card',
    aggregateId: cardId,
    actorId: userId,
    payload: { via: 'planning_promotion', planning_version_id: versionId }
  });
  revalidatePath('/planejamento');
  revalidatePath('/producao');
  return { card_id: cardId };
}

// ─── Template actions ────────────────────────────────────
export async function createTemplateAction(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const raw = extractTemplateForm(formData);
  const parsed = templateSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  try {
    const { orgId } = await requireTechnical();
    const t = await createTemplate(orgId, parsed.data);
    revalidatePath('/planejamento/templates');
    redirect(`/planejamento/templates/${t.id}`);
  } catch (e) {
    if (e instanceof Error && !e.message.includes('NEXT_REDIRECT'))
      return { ok: false, error: e.message };
    throw e;
  }
  return { ok: true };
}

export async function updateTemplateAction(id: string, patch: Record<string, unknown>): Promise<void> {
  await requireTechnical();
  const parsed = templateSchema.partial().safeParse(patch);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  await updateTemplate(id, parsed.data);
  revalidatePath('/planejamento/templates');
  revalidatePath(`/planejamento/templates/${id}`);
}

export async function deleteTemplateAction(id: string): Promise<void> {
  await requireTechnical();
  await deleteTemplate(id);
  revalidatePath('/planejamento/templates');
}

export async function addTemplateItemAction(input: {
  template_id: string;
  label: string;
  description?: string | null;
  position?: number;
  is_required?: boolean;
}): Promise<void> {
  const parsed = templateItemSchema.safeParse({
    template_id: input.template_id,
    label: input.label,
    description: input.description ?? null,
    position: input.position ?? 0,
    is_required: input.is_required ?? true
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  const { orgId } = await requireTechnical();
  await addTemplateItem(
    orgId,
    parsed.data.template_id,
    parsed.data.label,
    parsed.data.description ?? null,
    parsed.data.position,
    parsed.data.is_required
  );
  revalidatePath(`/planejamento/templates/${input.template_id}`);
}

export async function removeTemplateItemAction(id: string, templateId: string): Promise<void> {
  await requireTechnical();
  await removeTemplateItem(id);
  revalidatePath(`/planejamento/templates/${templateId}`);
}

// ─── Checklist actions ───────────────────────────────────
export async function toggleChecklistItemAction(input: {
  item_id: string;
  is_done: boolean;
  notes?: string | null;
}): Promise<void> {
  const parsed = checklistItemToggleSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  await requireInternal();
  await toggleChecklistItem(parsed.data.item_id, parsed.data.is_done, parsed.data.notes ?? null);
  revalidatePath('/planejamento');
}

export async function addChecklistItemAction(input: {
  planning_version_id: string;
  label: string;
  is_required?: boolean;
}): Promise<void> {
  const parsed = checklistItemAddSchema.safeParse({
    planning_version_id: input.planning_version_id,
    label: input.label,
    is_required: input.is_required ?? true
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  const { orgId } = await requireTechnical();
  await addChecklistItem(orgId, parsed.data.planning_version_id, parsed.data.label, parsed.data.is_required);
  revalidatePath('/planejamento');
}

export async function removeChecklistItemAction(id: string): Promise<void> {
  await requireTechnical();
  await removeChecklistItem(id);
  revalidatePath('/planejamento');
}

// ─── Backwards-compatible shim (Fase 2B WorkflowsTabs) ───
export async function createPlanningVersionAction(
  caseId: string,
  formData: FormData
): Promise<ActionState> {
  const fd = new FormData();
  fd.set('case_id', caseId);
  const desc = formData.get('technical_description');
  if (desc) fd.set('technical_description', desc);
  return createVersionAction(undefined, fd);
}

// ─── Comment actions ─────────────────────────────────────
export async function addCommentAction(input: {
  planning_version_id: string;
  body: string;
  is_internal?: boolean;
}): Promise<void> {
  const parsed = commentSchema.safeParse({
    planning_version_id: input.planning_version_id,
    body: input.body,
    is_internal: input.is_internal ?? true
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  const { orgId } = await requireInternal();
  await addComment(orgId, parsed.data.planning_version_id, parsed.data.body, parsed.data.is_internal);
  revalidatePath('/planejamento');
}
