import { z } from 'zod';

export const CARD_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type CardPriority = (typeof CARD_PRIORITIES)[number];

export const CARD_PRIORITY_LABELS: Record<CardPriority, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente'
};

export const CARD_PRIORITY_COLORS: Record<CardPriority, string> = {
  low: '#94A3B8',
  normal: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444'
};

export const TECH_STATUSES = ['active', 'inactive', 'vacation', 'on_leave'] as const;
export type TechStatus = (typeof TECH_STATUSES)[number];

export const TECH_STATUS_LABELS: Record<TechStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  vacation: 'Férias',
  on_leave: 'Afastado'
};

export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
  expert: 'Especialista'
};

// ─── stage schemas ─────────────────────────────────────────
export const stageSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(80),
  slug: z.string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_-]+$/, 'Use apenas letras minúsculas, números, - e _'),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida').default('#6B7280'),
  position: z.coerce.number().int().min(0).default(0),
  sla_hours: z.coerce.number().int().min(1).max(24 * 60).optional().nullable(),
  is_terminal: z.coerce.boolean().default(false),
  is_rework: z.coerce.boolean().default(false),
  is_initial: z.coerce.boolean().default(false),
  is_active: z.coerce.boolean().default(true)
});

export type StageInput = z.infer<typeof stageSchema>;

export function extractStageForm(fd: FormData): Record<string, unknown> {
  return {
    name: fd.get('name'),
    slug: fd.get('slug'),
    description: fd.get('description'),
    color: fd.get('color') || '#6B7280',
    position: fd.get('position') || 0,
    sla_hours: fd.get('sla_hours') || null,
    is_terminal: fd.get('is_terminal') === 'on' || fd.get('is_terminal') === 'true',
    is_rework: fd.get('is_rework') === 'on' || fd.get('is_rework') === 'true',
    is_initial: fd.get('is_initial') === 'on' || fd.get('is_initial') === 'true',
    is_active: fd.get('is_active') !== 'off' && fd.get('is_active') !== 'false'
  };
}

// ─── card schemas ──────────────────────────────────────────
export const cardCreateSchema = z.object({
  case_id: z.string().uuid('Caso inválido'),
  stage_id: z.string().uuid().optional(),
  assignee_id: z.string().uuid().optional().nullable(),
  priority: z.enum(CARD_PRIORITIES).default('normal')
});
export type CardCreateInput = z.infer<typeof cardCreateSchema>;

export const advanceCardSchema = z.object({
  card_id: z.string().uuid(),
  to_stage_id: z.string().uuid(),
  reason: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  is_rework: z.coerce.boolean().default(false)
});
export type AdvanceCardInput = z.infer<typeof advanceCardSchema>;

export const assignCardSchema = z.object({
  card_id: z.string().uuid(),
  assignee_id: z.string().uuid().nullable()
});

export const updatePrioritySchema = z.object({
  card_id: z.string().uuid(),
  priority: z.enum(CARD_PRIORITIES)
});

// ─── technician schemas ────────────────────────────────────
export const technicianSchema = z.object({
  profile_id: z.string().uuid('Selecione um usuário'),
  specialty: z.string().max(80).optional().nullable(),
  team: z.string().max(80).optional().nullable(),
  status: z.enum(TECH_STATUSES).default('active'),
  weekly_hours: z.coerce.number().int().min(1).max(80).default(40),
  hourly_cost: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().max(1000).optional().nullable()
});
export type TechnicianInput = z.infer<typeof technicianSchema>;

export function extractTechnicianForm(fd: FormData): Record<string, unknown> {
  return {
    profile_id: fd.get('profile_id'),
    specialty: fd.get('specialty'),
    team: fd.get('team'),
    status: fd.get('status') || 'active',
    weekly_hours: fd.get('weekly_hours') || 40,
    hourly_cost: fd.get('hourly_cost') || null,
    notes: fd.get('notes')
  };
}

export const skillSchema = z.object({
  technician_id: z.string().uuid(),
  skill: z.string().min(2).max(60),
  level: z.enum(SKILL_LEVELS).default('intermediate')
});
