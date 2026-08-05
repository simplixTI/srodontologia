import { z } from 'zod';

export const CALENDAR_EVENT_KINDS = [
  'pickup',
  'delivery',
  'production',
  'meeting',
  'return',
  'deadline',
  'sla',
  'internal',
  'other'
] as const;

export const calendarEventSchema = z
  .object({
    kind: z.enum(CALENDAR_EVENT_KINDS).default('other'),
    title: z.string().min(2).max(200),
    description: z.string().max(4000).optional().nullable(),
    start_at: z.string().min(10),
    end_at: z.string().min(10),
    all_day: z.coerce.boolean().default(false),
    location: z.string().max(300).optional().nullable(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
    case_id: z.string().uuid().optional().nullable()
  })
  .refine((v) => new Date(v.end_at).getTime() >= new Date(v.start_at).getTime(), {
    message: 'A hora de fim deve ser posterior à hora de início',
    path: ['end_at']
  });

export type CalendarEventInput = z.infer<typeof calendarEventSchema>;

export function extractCalendarForm(fd: FormData): Record<string, unknown> {
  return {
    kind: fd.get('kind') || 'other',
    title: fd.get('title'),
    description: fd.get('description'),
    start_at: fd.get('start_at'),
    end_at: fd.get('end_at'),
    all_day: fd.get('all_day') === 'on' || fd.get('all_day') === 'true',
    location: fd.get('location'),
    color: fd.get('color') || '#3B82F6',
    case_id: fd.get('case_id') || null
  };
}
