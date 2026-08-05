import { z } from 'zod';

export const QC_ITEM_RESULTS = ['pending', 'pass', 'fail', 'na'] as const;

// ─── Checklist ────────────────────────────────────────────
export const qcChecklistSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional().nullable(),
  case_type_id: z.string().uuid().optional().nullable(),
  is_default: z.coerce.boolean().default(false),
  is_active: z.coerce.boolean().default(true)
});
export type QcChecklistInput = z.infer<typeof qcChecklistSchema>;

export function extractQcChecklistForm(fd: FormData): Record<string, unknown> {
  return {
    name: fd.get('name'),
    description: fd.get('description'),
    case_type_id: fd.get('case_type_id') || null,
    is_default: fd.get('is_default') === 'on' || fd.get('is_default') === 'true',
    is_active: fd.get('is_active') !== 'off' && fd.get('is_active') !== 'false'
  };
}

export const qcChecklistItemSchema = z.object({
  checklist_id: z.string().uuid(),
  label: z.string().min(2).max(200),
  description: z.string().max(500).optional().nullable(),
  position: z.coerce.number().int().min(0).default(0),
  is_critical: z.coerce.boolean().default(false)
});

// ─── Inspection ───────────────────────────────────────────
export const inspectionCreateSchema = z.object({
  case_id: z.string().uuid(),
  production_card_id: z.string().uuid().optional().nullable(),
  checklist_id: z.string().uuid().optional().nullable()
});

export const inspectionItemUpdateSchema = z.object({
  item_id: z.string().uuid(),
  result: z.enum(QC_ITEM_RESULTS),
  reason: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable()
});

export const finalizeInspectionSchema = z.object({
  inspection_id: z.string().uuid(),
  rework_stage_id: z.string().uuid().optional().nullable(),
  overall_notes: z.string().max(2000).optional().nullable()
});
