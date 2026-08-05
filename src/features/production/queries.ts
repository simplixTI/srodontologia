import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  ProductionCard,
  ProductionCardWithCase,
  ProductionEventWithNames,
  ProductionStage,
  ProductionStageMetrics
} from './types';

export async function listStages(): Promise<ProductionStage[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('production_stages')
    .select('*')
    .order('position', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProductionStage[];
}

export async function listActiveStages(): Promise<ProductionStage[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('production_stages')
    .select('*')
    .eq('is_active', true)
    .order('position', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProductionStage[];
}

export async function listCards(): Promise<ProductionCardWithCase[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('production_cards')
    .select(`
      *,
      cases:cases!inner (
        case_number,
        title,
        patients ( initials, patient_code ),
        dentists ( full_name )
      ),
      assignee:profiles!production_cards_assignee_id_fkey ( full_name )
    `)
    .is('completed_at', null)
    .order('priority', { ascending: false })
    .order('entered_stage_at', { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => {
    const c = r.cases as { case_number?: string | null; title?: string | null; patients?: { initials?: string | null; patient_code?: string | null } | null; dentists?: { full_name?: string | null } | null } | null;
    const a = r.assignee as { full_name?: string | null } | null;
    return {
      id: r.id as string,
      organization_id: r.organization_id as string,
      case_id: r.case_id as string,
      current_stage_id: r.current_stage_id as string,
      assignee_id: (r.assignee_id as string | null) ?? null,
      priority: r.priority as ProductionCard['priority'],
      entered_stage_at: r.entered_stage_at as string,
      sla_due_at: (r.sla_due_at as string | null) ?? null,
      completed_at: (r.completed_at as string | null) ?? null,
      rework_count: (r.rework_count as number) ?? 0,
      total_time_ms: Number(r.total_time_ms ?? 0),
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
      case_code: c?.case_number ?? null,
      case_title: c?.title ?? null,
      patient_name: c?.patients?.initials ?? c?.patients?.patient_code ?? null,
      dentist_name: c?.dentists?.full_name ?? null,
      assignee_name: a?.full_name ?? null
    } satisfies ProductionCardWithCase;
  });
}

export async function getCard(id: string): Promise<ProductionCardWithCase | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('production_cards')
    .select(`
      *,
      cases:cases!inner (
        case_number,
        title,
        patients ( initials, patient_code ),
        dentists ( full_name )
      ),
      assignee:profiles!production_cards_assignee_id_fkey ( full_name )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  const r = data as Record<string, unknown>;
  const c = r.cases as { case_number?: string | null; title?: string | null; patients?: { initials?: string | null; patient_code?: string | null } | null; dentists?: { full_name?: string | null } | null } | null;
  const a = r.assignee as { name?: string | null } | null;
  return {
    id: r.id as string,
    organization_id: r.organization_id as string,
    case_id: r.case_id as string,
    current_stage_id: r.current_stage_id as string,
    assignee_id: (r.assignee_id as string | null) ?? null,
    priority: r.priority as ProductionCard['priority'],
    entered_stage_at: r.entered_stage_at as string,
    sla_due_at: (r.sla_due_at as string | null) ?? null,
    completed_at: (r.completed_at as string | null) ?? null,
    rework_count: (r.rework_count as number) ?? 0,
    total_time_ms: Number(r.total_time_ms ?? 0),
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    case_code: c?.case_number ?? null,
    case_title: c?.title ?? null,
    patient_name: c?.patients?.initials ?? c?.patients?.patient_code ?? null,
    dentist_name: c?.dentists?.full_name ?? null,
    assignee_name: a?.name ?? null
  } satisfies ProductionCardWithCase;
}

export async function listCardEvents(cardId: string): Promise<ProductionEventWithNames[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('production_events')
    .select(`
      *,
      from_stage:production_stages!production_events_from_stage_id_fkey ( name ),
      to_stage:production_stages!production_events_to_stage_id_fkey ( name ),
      actor:profiles!production_events_actor_id_fkey ( full_name )
    `)
    .eq('card_id', cardId)
    .order('occurred_at', { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    organization_id: r.organization_id as string,
    card_id: r.card_id as string,
    from_stage_id: (r.from_stage_id as string | null) ?? null,
    to_stage_id: (r.to_stage_id as string | null) ?? null,
    actor_id: (r.actor_id as string | null) ?? null,
    duration_ms: Number(r.duration_ms ?? 0),
    is_rework: Boolean(r.is_rework),
    reason: (r.reason as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    occurred_at: r.occurred_at as string,
    from_stage_name: (r.from_stage as { name?: string | null } | null)?.name ?? null,
    to_stage_name: (r.to_stage as { name?: string | null } | null)?.name ?? null,
    actor_name: (r.actor as { full_name?: string | null } | null)?.full_name ?? null
  }));
}

export async function listStageMetrics(): Promise<ProductionStageMetrics[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('v_production_metrics')
    .select('*')
    .order('position', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProductionStageMetrics[];
}
