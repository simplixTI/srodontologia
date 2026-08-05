'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  advanceCardSchema,
  assignCardSchema,
  updatePrioritySchema,
  stageSchema,
  extractStageForm,
  type CardPriority
} from '@/lib/validations/production';
import { publishEvent } from '@/lib/events';
import {
  advanceCard,
  assignCard,
  createCardForCase,
  createStage,
  deleteStage,
  reorderStages,
  updatePriority,
  updateStage
} from './service';

export type ActionState = { ok: boolean; error?: string; id?: string };

type Session = {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  userId: string;
  orgId: string;
  role: string;
};

async function requireSession(): Promise<Session> {
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

  return { supabase, userId: user.id, orgId: profile.organization_id, role: profile.role };
}

function requireRole(role: string, allowed: string[]) {
  if (!allowed.includes(role)) throw new Error('Forbidden');
}

// ─── Stage CRUD ───────────────────────────────────────────
export async function createStageAction(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const raw = extractStageForm(formData);
  const parsed = stageSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  try {
    const { orgId, role } = await requireSession();
    requireRole(role, ['super_admin', 'admin', 'technical_planning']);
    const stage = await createStage(orgId, parsed.data);
    revalidatePath('/producao');
    revalidatePath('/producao/configurar');
    return { ok: true, id: stage.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateStageAction(id: string, patch: Record<string, unknown>): Promise<void> {
  const { role } = await requireSession();
  requireRole(role, ['super_admin', 'admin', 'technical_planning']);
  const parsed = stageSchema.partial().safeParse(patch);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  await updateStage(id, parsed.data);
  revalidatePath('/producao');
  revalidatePath('/producao/configurar');
}

export async function deleteStageAction(id: string): Promise<void> {
  const { role } = await requireSession();
  requireRole(role, ['super_admin', 'admin', 'technical_planning']);
  await deleteStage(id);
  revalidatePath('/producao');
  revalidatePath('/producao/configurar');
}

export async function reorderStagesAction(ids: string[]): Promise<void> {
  const { role } = await requireSession();
  requireRole(role, ['super_admin', 'admin', 'technical_planning']);
  await reorderStages(ids);
  revalidatePath('/producao');
  revalidatePath('/producao/configurar');
}

// ─── Card actions ─────────────────────────────────────────
export async function createCardForCaseAction(caseId: string): Promise<{ id: string }> {
  const { userId, orgId, role } = await requireSession();
  requireRole(role, ['super_admin', 'admin', 'technical_planning', 'production', 'logistics']);
  const card = await createCardForCase(orgId, caseId);
  await publishEvent({
    organizationId: orgId,
    type: 'production.card_created',
    aggregateType: 'production_card',
    aggregateId: card.id,
    actorId: userId,
    payload: { case_id: caseId, stage_id: card.current_stage_id }
  });
  revalidatePath('/producao');
  return { id: card.id };
}

export async function advanceCardAction(input: {
  card_id: string;
  to_stage_id: string;
  reason?: string | null;
  notes?: string | null;
  is_rework?: boolean;
}): Promise<void> {
  const parsed = advanceCardSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');

  const { userId, orgId, role } = await requireSession();
  requireRole(role, ['super_admin', 'admin', 'technical_planning', 'production', 'logistics']);

  const card = await advanceCard(parsed.data);

  await publishEvent({
    organizationId: orgId,
    type: parsed.data.is_rework
      ? 'production.rework_flagged'
      : card.completed_at
        ? 'production.card_completed'
        : 'production.stage_changed',
    aggregateType: 'production_card',
    aggregateId: card.id,
    actorId: userId,
    payload: {
      to_stage_id: parsed.data.to_stage_id,
      is_rework: parsed.data.is_rework ?? false,
      reason: parsed.data.reason ?? null
    }
  });

  revalidatePath('/producao');
  revalidatePath(`/producao/${card.id}`);
}

export async function assignCardAction(input: {
  card_id: string;
  assignee_id: string | null;
}): Promise<void> {
  const parsed = assignCardSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');

  const { userId, orgId, role } = await requireSession();
  requireRole(role, ['super_admin', 'admin', 'technical_planning', 'production', 'logistics']);

  await assignCard(parsed.data.card_id, parsed.data.assignee_id);

  await publishEvent({
    organizationId: orgId,
    type: 'production.card_assigned',
    aggregateType: 'production_card',
    aggregateId: parsed.data.card_id,
    actorId: userId,
    payload: { assignee_id: parsed.data.assignee_id }
  });
  revalidatePath('/producao');
  revalidatePath(`/producao/${parsed.data.card_id}`);
}

export async function updatePriorityAction(input: {
  card_id: string;
  priority: CardPriority;
}): Promise<void> {
  const parsed = updatePrioritySchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');

  const { role } = await requireSession();
  requireRole(role, ['super_admin', 'admin', 'technical_planning', 'production', 'logistics']);

  await updatePriority(parsed.data.card_id, parsed.data.priority);
  revalidatePath('/producao');
  revalidatePath(`/producao/${parsed.data.card_id}`);
}

// Fire+redirect helper for create-from-case form
export async function createCardAndRedirect(caseId: string) {
  const { id } = await createCardForCaseAction(caseId);
  redirect(`/producao/${id}`);
}
