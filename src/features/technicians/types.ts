import type { SkillLevel, TechStatus } from '@/lib/validations/production';

export type Technician = {
  id: string;
  organization_id: string;
  profile_id: string;
  specialty: string | null;
  team: string | null;
  status: TechStatus;
  weekly_hours: number;
  hourly_cost: number | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type TechnicianWithProfile = Technician & {
  name: string | null;
  email: string | null;
  role: string | null;
};

export type TechnicianSkill = {
  id: string;
  technician_id: string;
  skill: string;
  level: SkillLevel;
  created_at: string;
};

export type TechnicianWorkload = {
  technician_id: string;
  organization_id: string;
  profile_id: string;
  technician_name: string | null;
  specialty: string | null;
  status: TechStatus;
  active_cards: number;
  overdue_cards: number;
  urgent_cards: number;
  total_rework: number;
};
