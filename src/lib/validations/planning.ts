import { z } from 'zod';
import type { PlanningStatus } from '@/features/planning/types';

export const PLANNING_STATUSES: readonly PlanningStatus[] = [
  'draft',
  'sent',
  'approved',
  'changes_requested',
  'obsolete'
] as const;

// ─── Version ───────────────────────────────────────────────
export const versionCreateSchema = z.object({
  case_id: z.string().uuid(),
  technical_description: z.string().max(20000).optional().nullable(),
  template_id: z.string().uuid().optional().nullable(),
  estimated_delivery_at: z.string().datetime().optional().nullable()
});
export type VersionCreateInput = z.infer<typeof versionCreateSchema>;

export const versionUpdateSchema = z.object({
  technical_description: z.string().max(20000).optional().nullable(),
  estimated_delivery_at: z.string().datetime().optional().nullable()
});

export const transitionSchema = z.object({
  version_id: z.string().uuid(),
  target: z.enum(['sent', 'approved', 'changes_requested', 'obsolete']),
  comment: z.string().max(2000).optional().nullable()
});

// ─── Template ──────────────────────────────────────────────
export const templateSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional().nullable(),
  case_type_id: z.string().uuid().optional().nullable(),
  is_default: z.coerce.boolean().default(false),
  is_active: z.coerce.boolean().default(true)
});
export type TemplateInput = z.infer<typeof templateSchema>;

export function extractTemplateForm(fd: FormData): Record<string, unknown> {
  return {
    name: fd.get('name'),
    description: fd.get('description'),
    case_type_id: fd.get('case_type_id') || null,
    is_default: fd.get('is_default') === 'on' || fd.get('is_default') === 'true',
    is_active: fd.get('is_active') !== 'off' && fd.get('is_active') !== 'false'
  };
}

export const templateItemSchema = z.object({
  template_id: z.string().uuid(),
  label: z.string().min(2).max(200),
  description: z.string().max(500).optional().nullable(),
  position: z.coerce.number().int().min(0).default(0),
  is_required: z.coerce.boolean().default(true)
});

// ─── Checklist item ────────────────────────────────────────
export const checklistItemToggleSchema = z.object({
  item_id: z.string().uuid(),
  is_done: z.coerce.boolean(),
  notes: z.string().max(1000).optional().nullable()
});

export const checklistItemAddSchema = z.object({
  planning_version_id: z.string().uuid(),
  label: z.string().min(2).max(200),
  description: z.string().max(500).optional().nullable(),
  is_required: z.coerce.boolean().default(true)
});

// ─── Comment ───────────────────────────────────────────────
export const commentSchema = z.object({
  planning_version_id: z.string().uuid(),
  body: z.string().min(1).max(4000),
  is_internal: z.coerce.boolean().default(true)
});
