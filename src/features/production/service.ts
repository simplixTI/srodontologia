import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { StageInput } from '@/lib/validations/production';
import type { ProductionCard, ProductionStage } from './types';

export async function createStage(orgId: string, input: StageInput): Promise<ProductionStage> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('production_stages')
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      slug: input.slug.trim(),
      description: input.description ?? null,
      color: input.color,
      position: input.position,
      sla_hours: input.sla_hours ?? null,
      is_terminal: input.is_terminal,
      is_rework: input.is_rework,
      is_initial: input.is_initial,
      is_active: input.is_active
    } as never)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as ProductionStage;
}

export async function updateStage(id: string, patch: Partial<StageInput>): Promise<ProductionStage> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('production_stages')
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.slug !== undefined ? { slug: patch.slug.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description ?? null } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.position !== undefined ? { position: patch.position } : {}),
      ...(patch.sla_hours !== undefined ? { sla_hours: patch.sla_hours ?? null } : {}),
      ...(patch.is_terminal !== undefined ? { is_terminal: patch.is_terminal } : {}),
      ...(patch.is_rework !== undefined ? { is_rework: patch.is_rework } : {}),
      ...(patch.is_initial !== undefined ? { is_initial: patch.is_initial } : {}),
      ...(patch.is_active !== undefined ? { is_active: patch.is_active } : {})
    } as never)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as ProductionStage;
}

export async function deleteStage(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { count, error: cErr } = await supabase
    .from('production_cards')
    .select('*', { count: 'exact', head: true })
    .eq('current_stage_id', id);
  if (cErr) throw new Error(cErr.message);
  if ((count ?? 0) > 0) {
    throw new Error('Não é possível excluir uma etapa com cartões ativos.');
  }
  const { error } = await supabase.from('production_stages').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function reorderStages(ids: string[]): Promise<void> {
  const supabase = createSupabaseServerClient();
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase
      .from('production_stages')
      .update({ position: i * 10 } as never)
      .eq('id', ids[i]);
    if (error) throw new Error(error.message);
  }
}

// ─── cards ────────────────────────────────────────────────
export async function createCardForCase(
  orgId: string,
  caseId: string
): Promise<ProductionCard> {
  const supabase = createSupabaseServerClient();

  const { data: initialStage, error: sErr } = await supabase
    .from('production_stages')
    .select('id, sla_hours')
    .eq('organization_id', orgId)
    .eq('is_initial', true)
    .eq('is_active', true)
    .maybeSingle<{ id: string; sla_hours: number | null }>();
  if (sErr) throw new Error(sErr.message);
  if (!initialStage) throw new Error('Configure uma etapa inicial em Produção.');

  const sla_due_at =
    initialStage.sla_hours != null
      ? new Date(Date.now() + initialStage.sla_hours * 3600_000).toISOString()
      : null;

  const { data, error } = await supabase
    .from('production_cards')
    .insert({
      organization_id: orgId,
      case_id: caseId,
      current_stage_id: initialStage.id,
      sla_due_at
    } as never)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      const existing = await supabase
        .from('production_cards')
        .select('*')
        .eq('case_id', caseId)
        .maybeSingle<ProductionCard>();
      if (existing.data) return existing.data;
    }
    throw new Error(error.message);
  }
  return data as ProductionCard;
}

export async function advanceCard(input: {
  card_id: string;
  to_stage_id: string;
  reason?: string | null;
  notes?: string | null;
  is_rework?: boolean;
}): Promise<ProductionCard> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc('advance_production_card', {
    p_card_id: input.card_id,
    p_to_stage_id: input.to_stage_id,
    p_reason: input.reason ?? null,
    p_notes: input.notes ?? null,
    p_is_rework: input.is_rework ?? false
  });
  if (error) throw new Error(error.message);
  return data as ProductionCard;
}

export async function assignCard(cardId: string, assigneeId: string | null): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('production_cards')
    .update({ assignee_id: assigneeId } as never)
    .eq('id', cardId);
  if (error) throw new Error(error.message);
}

export async function updatePriority(cardId: string, priority: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('production_cards')
    .update({ priority } as never)
    .eq('id', cardId);
  if (error) throw new Error(error.message);
}
