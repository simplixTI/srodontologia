import { z } from 'zod';
import { CUSTOMER_STATUSES } from './dentists';

export const leadSchema = z.object({
  full_name: z.string().min(2, 'Nome muito curto.').max(200),
  clinic_name: z.string().max(200).optional().or(z.literal('')),
  cro_number: z.string().max(20).optional().or(z.literal('')),
  cro_state: z.string().max(2).optional().or(z.literal('')),
  specialty: z.string().max(120).optional().or(z.literal('')),
  email: z.string().max(200).email('E-mail inválido.').optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  whatsapp: z.string().max(30).optional().or(z.literal('')),
  instagram: z.string().max(60).optional().or(z.literal('')),
  city: z.string().max(120).optional().or(z.literal('')),
  state: z.string().max(2).optional().or(z.literal('')),
  source: z.string().max(60).optional().or(z.literal('')),
  pipeline_stage: z.enum(CUSTOMER_STATUSES).default('lead'),
  estimated_value: z.coerce.number().min(0).optional(),
  commercial_owner_id: z.string().uuid().optional().or(z.literal('')),
  next_follow_up_at: z.string().optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal(''))
});
export type LeadInput = z.infer<typeof leadSchema>;

export function extractLeadForm(formData: FormData) {
  const g = (k: string) => (formData.get(k) as string | null) ?? '';
  const val = g('estimated_value');
  return {
    full_name: g('full_name'),
    clinic_name: g('clinic_name'),
    cro_number: g('cro_number'),
    cro_state: g('cro_state').toUpperCase(),
    specialty: g('specialty'),
    email: g('email'),
    phone: g('phone'),
    whatsapp: g('whatsapp'),
    instagram: g('instagram').replace(/^@/, ''),
    city: g('city'),
    state: g('state').toUpperCase(),
    source: g('source'),
    pipeline_stage: (g('pipeline_stage') || 'lead') as (typeof CUSTOMER_STATUSES)[number],
    estimated_value: val ? Number(val) : undefined,
    commercial_owner_id: g('commercial_owner_id'),
    next_follow_up_at: g('next_follow_up_at'),
    notes: g('notes')
  };
}
