import type { CardPriority } from '@/lib/validations/production';

export type ProductionStage = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  position: number;
  sla_hours: number | null;
  is_terminal: boolean;
  is_rework: boolean;
  is_initial: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductionCard = {
  id: string;
  organization_id: string;
  case_id: string;
  current_stage_id: string;
  assignee_id: string | null;
  priority: CardPriority;
  entered_stage_at: string;
  sla_due_at: string | null;
  completed_at: string | null;
  rework_count: number;
  total_time_ms: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ProductionCardWithCase = ProductionCard & {
  case_code: string | null;
  case_title: string | null;
  patient_name: string | null;
  dentist_name: string | null;
  assignee_name: string | null;
};

export type ProductionEvent = {
  id: string;
  organization_id: string;
  card_id: string;
  from_stage_id: string | null;
  to_stage_id: string | null;
  actor_id: string | null;
  duration_ms: number;
  is_rework: boolean;
  reason: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
};

export type ProductionEventWithNames = ProductionEvent & {
  from_stage_name: string | null;
  to_stage_name: string | null;
  actor_name: string | null;
};

export type ProductionStageMetrics = {
  stage_id: string;
  stage_name: string;
  stage_color: string;
  position: number;
  is_terminal: boolean;
  is_rework: boolean;
  active_cards: number;
  overdue_cards: number;
  avg_time_in_stage_seconds: number | null;
};
