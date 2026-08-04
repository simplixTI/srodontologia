export type PlanningStatus = 'draft' | 'sent' | 'approved' | 'changes_requested' | 'obsolete';

export const PLANNING_STATUS_LABELS: Record<PlanningStatus, string> = {
  draft: 'Rascunho',
  sent: 'Enviado ao dentista',
  approved: 'Aprovado',
  changes_requested: 'Alteração solicitada',
  obsolete: 'Substituído'
};

export type PlanningVersion = {
  id: string;
  case_id: string;
  version_number: number;
  status: PlanningStatus;
  technical_description: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
};
