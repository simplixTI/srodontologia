import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CasePriority } from '@/lib/validations/cases';

export type PublicCaseStatus = keyof typeof import('@/lib/validations/cases').PUBLIC_STATUS_LABELS;

export type CaseRow = {
  id: string;
  organization_id: string;
  case_number: string;
  dentist_id: string;
  clinic_id: string | null;
  patient_id: string | null;
  case_type_id: string | null;
  title: string;
  priority: CasePriority;
  internal_status: string;
  public_status: PublicCaseStatus;
  clinical_description: string | null;
  dentist_notes: string | null;
  internal_notes: string | null;
  teeth_regions: string[] | null;
  material: string | null;
  shade: string | null;
  requested_delivery_date: string | null;
  estimated_delivery_date: string | null;
  actual_delivery_date: string | null;
  commercial_owner_id: string | null;
  technical_owner_id: string | null;
  production_owner_id: string | null;
  created_by: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  duplicated_from_case_id: string | null;
  health_score: number;
  missing_required_items_count: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type CaseWithRelations = CaseRow & {
  dentist: { id: string; full_name: string; cro_state: string | null; cro_number: string | null } | null;
  clinic: { id: string; trade_name: string } | null;
  case_type: { id: string; name: string } | null;
};

export async function listCases(opts?: { search?: string; status?: string }) {
  const supabase = createSupabaseServerClient();
  let q = supabase
    .from('cases')
    .select(
      'id, case_number, title, priority, internal_status, public_status, health_score, missing_required_items_count, requested_delivery_date, updated_at, created_at, dentist:dentists(id, full_name), clinic:clinics(id, trade_name), case_type:case_types(id, name)'
    )
    .is('archived_at', null)
    .order('updated_at', { ascending: false });

  if (opts?.search && opts.search.trim().length > 0) {
    const s = opts.search.trim();
    q = q.or(`title.ilike.%${s}%,case_number.ilike.%${s}%`);
  }
  if (opts?.status) {
    q = q.eq('internal_status', opts.status);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as (Pick<
    CaseRow,
    'id' | 'case_number' | 'title' | 'priority' | 'internal_status' |
    'public_status' | 'health_score' | 'missing_required_items_count' |
    'requested_delivery_date' | 'updated_at' | 'created_at'
  > & {
    dentist: { id: string; full_name: string } | null;
    clinic: { id: string; trade_name: string } | null;
    case_type: { id: string; name: string } | null;
  })[];
}

export async function getCase(id: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cases')
    .select(
      '*, dentist:dentists(id, full_name, cro_state, cro_number), clinic:clinics(id, trade_name), case_type:case_types(id, name)'
    )
    .eq('id', id)
    .maybeSingle<CaseWithRelations>();
  if (error) throw new Error(error.message);
  return data;
}

export type CaseChecklistItem = {
  id: string;
  case_id: string;
  checklist_template_item_id: string | null;
  title_snapshot: string;
  description_snapshot: string | null;
  required_snapshot: boolean;
  category_snapshot: string;
  accepted_file_types_snapshot: string[];
  minimum_files_snapshot: number;
  maximum_files_snapshot: number;
  sort_order_snapshot: number;
  status: 'pending' | 'in_progress' | 'completed' | 'waived';
  completed: boolean;
  completed_at: string | null;
  waived_reason: string | null;
  notes: string | null;
};

export async function listCaseChecklist(caseId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('case_checklist_items')
    .select('*')
    .eq('case_id', caseId)
    .order('sort_order_snapshot', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as CaseChecklistItem[];
}

export type StatusHistoryEntry = {
  id: string;
  previous_internal_status: string | null;
  new_internal_status: string;
  previous_public_status: string | null;
  new_public_status: string | null;
  public_note: string | null;
  changed_by: string | null;
  created_at: string;
  changer: { id: string; full_name: string } | null;
};

export async function getCaseTimeline(caseId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('case_status_history')
    .select(
      'id, previous_internal_status, new_internal_status, previous_public_status, new_public_status, public_note, changed_by, created_at, changer:profiles!changed_by(id, full_name)'
    )
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as StatusHistoryEntry[];
}

// Selects for the wizard
export async function listDentistsForSelect() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('dentists')
    .select('id, full_name, primary_clinic_id')
    .eq('active', true)
    .is('archived_at', null)
    .order('full_name');
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; full_name: string; primary_clinic_id: string | null }[];
}

export async function listCaseTypesForSelect() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('case_types')
    .select('id, name')
    .eq('active', true)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; name: string }[];
}
