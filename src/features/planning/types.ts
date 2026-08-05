export type PlanningStatus = 'draft' | 'sent' | 'approved' | 'changes_requested' | 'obsolete';

export const PLANNING_STATUS_LABELS: Record<PlanningStatus, string> = {
  draft: 'Rascunho',
  sent: 'Enviado ao dentista',
  approved: 'Aprovado',
  changes_requested: 'Alteração solicitada',
  obsolete: 'Substituído'
};

export const PLANNING_STATUS_COLORS: Record<PlanningStatus, string> = {
  draft: 'border-white/20 text-white/60 bg-white/[0.03]',
  sent: 'border-blue-400/40 text-blue-200 bg-blue-400/10',
  approved: 'border-emerald-400/40 text-emerald-200 bg-emerald-400/10',
  changes_requested: 'border-amber-400/40 text-amber-200 bg-amber-400/10',
  obsolete: 'border-white/10 text-white/40 bg-transparent'
};

export type PlanningVersion = {
  id: string;
  organization_id: string;
  case_id: string;
  version_number: number;
  status: PlanningStatus;
  technical_description: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  dentist_signed_at: string | null;
  internal_signed_at: string | null;
  checklist_completed_at: string | null;
  sent_at: string | null;
  promoted_to_production_at: string | null;
  production_card_id: string | null;
  template_id: string | null;
  estimated_delivery_at: string | null;
};

export type PlanningVersionWithCase = PlanningVersion & {
  case_number: string | null;
  case_title: string | null;
  dentist_name: string | null;
  patient_initials: string | null;
};

export type PlanningTemplate = {
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

export type PlanningTemplateItem = {
  id: string;
  template_id: string;
  organization_id: string;
  label: string;
  description: string | null;
  position: number;
  is_required: boolean;
  created_at: string;
};

export type PlanningChecklistItem = {
  id: string;
  organization_id: string;
  planning_version_id: string;
  label: string;
  description: string | null;
  position: number;
  is_required: boolean;
  is_done: boolean;
  done_by: string | null;
  done_at: string | null;
  notes: string | null;
  created_at: string;
};

export type PlanningComment = {
  id: string;
  organization_id: string;
  planning_version_id: string;
  author_id: string | null;
  is_internal: boolean;
  body: string;
  created_at: string;
  author_name: string | null;
};

export type PlanningActivity = {
  version_id: string;
  case_id: string;
  organization_id: string;
  version_number: number;
  status: PlanningStatus;
  created_at: string;
  approved_at: string | null;
  promoted_to_production_at: string | null;
  comment_count: number;
  checklist_total: number;
  checklist_done: number;
};
