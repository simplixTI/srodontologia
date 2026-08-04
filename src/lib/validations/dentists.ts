import { z } from 'zod';

export const CUSTOMER_STATUSES = [
  'lead',
  'contacted',
  'presentation_scheduled',
  'presentation_completed',
  'first_case',
  'active_customer',
  'premium_customer',
  'inactive_customer',
  'lost'
] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  lead: 'Lead',
  contacted: 'Contato realizado',
  presentation_scheduled: 'Apresentação agendada',
  presentation_completed: 'Apresentação realizada',
  first_case: 'Primeiro caso',
  active_customer: 'Cliente ativo',
  premium_customer: 'Cliente premium',
  inactive_customer: 'Cliente inativo',
  lost: 'Perdido'
};

export const dentistSchema = z.object({
  full_name: z.string().min(2, 'Nome muito curto.').max(200),
  primary_clinic_id: z.string().uuid().optional().or(z.literal('')),
  cpf: z.string().max(20).optional().or(z.literal('')),
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
  commercial_owner_id: z.string().uuid().optional().or(z.literal('')),
  customer_status: z.enum(CUSTOMER_STATUSES).default('lead'),
  payment_terms: z.string().max(200).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
  active: z.coerce.boolean().default(true)
});
export type DentistInput = z.infer<typeof dentistSchema>;

export function extractDentistForm(formData: FormData) {
  const g = (k: string) => (formData.get(k) as string | null) ?? '';
  return {
    full_name: g('full_name'),
    primary_clinic_id: g('primary_clinic_id'),
    cpf: g('cpf'),
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
    commercial_owner_id: g('commercial_owner_id'),
    customer_status: (g('customer_status') || 'lead') as (typeof CUSTOMER_STATUSES)[number],
    payment_terms: g('payment_terms'),
    notes: g('notes'),
    active: formData.get('active') === 'on'
  };
}
