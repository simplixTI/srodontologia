export type QcInspectionStatus =
  | 'pending'
  | 'in_progress'
  | 'passed'
  | 'failed'
  | 'cancelled';

export const QC_STATUS_LABELS: Record<QcInspectionStatus, string> = {
  pending: 'Aguardando',
  in_progress: 'Em andamento',
  passed: 'Aprovado',
  failed: 'Reprovado',
  cancelled: 'Cancelado'
};

export const QC_STATUS_COLORS: Record<QcInspectionStatus, string> = {
  pending: 'border-white/20 text-white/60',
  in_progress: 'border-blue-400/40 text-blue-200 bg-blue-400/10',
  passed: 'border-emerald-400/40 text-emerald-200 bg-emerald-400/10',
  failed: 'border-red-400/40 text-red-200 bg-red-400/10',
  cancelled: 'border-white/10 text-white/40'
};

export type QcItemResult = 'pending' | 'pass' | 'fail' | 'na';

export const QC_ITEM_RESULT_LABELS: Record<QcItemResult, string> = {
  pending: 'Pendente',
  pass: 'OK',
  fail: 'Falha',
  na: 'N/A'
};

export type QcChecklist = {
  id: string;
  organization_id: string;
  case_type_id: string | null;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type QcChecklistItem = {
  id: string;
  organization_id: string;
  checklist_id: string;
  label: string;
  description: string | null;
  position: number;
  is_critical: boolean;
  created_at: string;
};

export type QcInspection = {
  id: string;
  organization_id: string;
  case_id: string;
  production_card_id: string | null;
  checklist_id: string | null;
  status: QcInspectionStatus;
  overall_notes: string | null;
  inspector_id: string | null;
  started_at: string | null;
  finished_at: string | null;
  rework_stage_id: string | null;
  created_at: string;
  updated_at: string;
};

export type QcInspectionWithCase = QcInspection & {
  case_number: string | null;
  case_title: string | null;
  patient_initials: string | null;
  checklist_name: string | null;
};

export type QcInspectionItem = {
  id: string;
  organization_id: string;
  inspection_id: string;
  checklist_item_id: string | null;
  label: string;
  is_critical: boolean;
  position: number;
  result: QcItemResult;
  reason: string | null;
  notes: string | null;
  answered_by: string | null;
  answered_at: string | null;
  created_at: string;
};

export type QcMetrics = {
  organization_id: string;
  passed_total: number;
  failed_total: number;
  passed_7d: number;
  failed_7d: number;
  open_total: number;
};
