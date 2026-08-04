import { z } from 'zod';

export const clinicSchema = z.object({
  trade_name: z.string().min(2, 'Nome muito curto.').max(200),
  legal_name: z.string().max(200).optional().or(z.literal('')),
  document: z.string().max(20).optional().or(z.literal('')),
  email: z.string().max(200).email('E-mail inválido.').optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  whatsapp: z.string().max(30).optional().or(z.literal('')),
  address_line: z.string().max(300).optional().or(z.literal('')),
  address_number: z.string().max(20).optional().or(z.literal('')),
  address_complement: z.string().max(200).optional().or(z.literal('')),
  neighborhood: z.string().max(150).optional().or(z.literal('')),
  city: z.string().max(120).optional().or(z.literal('')),
  state: z.string().max(2).optional().or(z.literal('')),
  zip_code: z.string().max(15).optional().or(z.literal('')),
  financial_contact_name: z.string().max(200).optional().or(z.literal('')),
  financial_contact_email: z.string().max(200).email('E-mail inválido.').optional().or(z.literal('')),
  financial_contact_phone: z.string().max(30).optional().or(z.literal('')),
  payment_terms: z.string().max(200).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
  active: z.coerce.boolean().default(true)
});
export type ClinicInput = z.infer<typeof clinicSchema>;

export function extractClinicForm(formData: FormData) {
  const g = (k: string) => (formData.get(k) as string | null) ?? '';
  return {
    trade_name: g('trade_name'),
    legal_name: g('legal_name'),
    document: g('document'),
    email: g('email'),
    phone: g('phone'),
    whatsapp: g('whatsapp'),
    address_line: g('address_line'),
    address_number: g('address_number'),
    address_complement: g('address_complement'),
    neighborhood: g('neighborhood'),
    city: g('city'),
    state: g('state').toUpperCase(),
    zip_code: g('zip_code'),
    financial_contact_name: g('financial_contact_name'),
    financial_contact_email: g('financial_contact_email'),
    financial_contact_phone: g('financial_contact_phone'),
    payment_terms: g('payment_terms'),
    notes: g('notes'),
    active: formData.get('active') === 'on'
  };
}
