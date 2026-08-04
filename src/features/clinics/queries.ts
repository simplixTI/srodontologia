import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type Clinic = {
  id: string;
  organization_id: string;
  trade_name: string;
  legal_name: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address_line: string | null;
  address_number: string | null;
  address_complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  financial_contact_name: string | null;
  financial_contact_email: string | null;
  financial_contact_phone: string | null;
  payment_terms: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export async function listClinics(opts?: { search?: string; onlyActive?: boolean }) {
  const supabase = createSupabaseServerClient();
  let q = supabase
    .from('clinics')
    .select('*')
    .is('archived_at', null)
    .order('trade_name', { ascending: true });

  if (opts?.onlyActive) q = q.eq('active', true);
  if (opts?.search && opts.search.trim().length > 0) {
    q = q.ilike('trade_name', `%${opts.search.trim()}%`);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Clinic[];
}

export async function getClinic(id: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinics')
    .select('*')
    .eq('id', id)
    .maybeSingle<Clinic>();
  if (error) throw new Error(error.message);
  return data;
}

export async function getClinicDentists(clinicId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinic_dentists')
    .select('id, is_primary, active, role_at_clinic, dentist:dentists(id, full_name, cro_state, cro_number, specialty, customer_status, active)')
    .eq('clinic_id', clinicId);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as {
    id: string;
    is_primary: boolean;
    active: boolean;
    role_at_clinic: string | null;
    dentist: {
      id: string;
      full_name: string;
      cro_state: string | null;
      cro_number: string | null;
      specialty: string | null;
      customer_status: string;
      active: boolean;
    } | null;
  }[];
}
