import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  QcChecklist,
  QcChecklistItem,
  QcInspection,
  QcInspectionItem,
  QcInspectionStatus,
  QcInspectionWithCase,
  QcMetrics
} from './types';

// ─── Checklists ───────────────────────────────────────────
export async function listChecklists(): Promise<QcChecklist[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('qc_checklists')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as QcChecklist[];
}

export async function getChecklist(id: string): Promise<QcChecklist | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('qc_checklists')
    .select('*')
    .eq('id', id)
    .maybeSingle<QcChecklist>();
  if (error) throw new Error(error.message);
  return data;
}

export async function listChecklistItems(checklistId: string): Promise<QcChecklistItem[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('qc_checklist_items')
    .select('*')
    .eq('checklist_id', checklistId)
    .order('position', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as QcChecklistItem[];
}

// ─── Inspections ──────────────────────────────────────────
export async function listInspections(filter?: {
  status?: QcInspectionStatus;
}): Promise<QcInspectionWithCase[]> {
  const supabase = createSupabaseServerClient();
  let q = supabase
    .from('qc_inspections')
    .select(`
      *,
      cases:cases!inner (
        case_number,
        title,
        patients ( initials, patient_code )
      ),
      qc_checklists ( name )
    `)
    .order('created_at', { ascending: false })
    .limit(200);
  if (filter?.status) q = q.eq('status', filter.status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => {
    const c = r.cases as {
      case_number?: string | null;
      title?: string | null;
      patients?: { initials?: string | null; patient_code?: string | null } | null;
    } | null;
    return {
      ...(r as unknown as QcInspection),
      case_number: c?.case_number ?? null,
      case_title: c?.title ?? null,
      patient_initials: c?.patients?.initials ?? c?.patients?.patient_code ?? null,
      checklist_name: (r.qc_checklists as { name?: string | null } | null)?.name ?? null
    } satisfies QcInspectionWithCase;
  });
}

export async function getInspection(id: string): Promise<QcInspection | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('qc_inspections')
    .select('*')
    .eq('id', id)
    .maybeSingle<QcInspection>();
  if (error) throw new Error(error.message);
  return data;
}

export async function listInspectionItems(inspectionId: string): Promise<QcInspectionItem[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('qc_inspection_items')
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('position', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as QcInspectionItem[];
}

export async function getMetrics(): Promise<QcMetrics | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from('v_qc_metrics').select('*').maybeSingle<QcMetrics>();
  if (error) throw new Error(error.message);
  return data;
}
