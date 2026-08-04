import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CustomerStatus } from '@/lib/validations/dentists';

export type Dentist = {
  id: string;
  organization_id: string;
  profile_id: string | null;
  primary_clinic_id: string | null;
  full_name: string;
  cpf: string | null;
  cro_number: string | null;
  cro_state: string | null;
  specialty: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  city: string | null;
  state: string | null;
  source: string | null;
  commercial_owner_id: string | null;
  customer_status: CustomerStatus;
  credit_limit: number | null;
  payment_terms: string | null;
  notes: string | null;
  active: boolean;
  last_case_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type DentistWithRelations = Dentist & {
  primary_clinic: { id: string; trade_name: string } | null;
  commercial_owner: { id: string; full_name: string; email: string } | null;
};

export async function listDentists(opts?: { search?: string }) {
  const supabase = createSupabaseServerClient();
  let q = supabase
    .from('dentists')
    .select(
      'id, full_name, cro_number, cro_state, specialty, email, phone, whatsapp, city, state, customer_status, active, last_case_at, primary_clinic:clinics!primary_clinic_id(id, trade_name)'
    )
    .is('archived_at', null)
    .order('full_name', { ascending: true });

  if (opts?.search && opts.search.trim().length > 0) {
    q = q.ilike('full_name', `%${opts.search.trim()}%`);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as (Pick<
    Dentist,
    'id' | 'full_name' | 'cro_number' | 'cro_state' | 'specialty' |
    'email' | 'phone' | 'whatsapp' | 'city' | 'state' |
    'customer_status' | 'active' | 'last_case_at'
  > & {
    primary_clinic: { id: string; trade_name: string } | null;
  })[];
}

export async function getDentist(id: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('dentists')
    .select(
      '*, primary_clinic:clinics!primary_clinic_id(id, trade_name), commercial_owner:profiles!commercial_owner_id(id, full_name, email)'
    )
    .eq('id', id)
    .maybeSingle<DentistWithRelations>();
  if (error) throw new Error(error.message);
  return data;
}

export async function listInternalStaff() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .neq('role', 'dentist')
    .eq('status', 'active')
    .order('full_name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as {
    id: string;
    full_name: string;
    email: string;
    role: string;
  }[];
}

export async function listClinicsForSelect() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinics')
    .select('id, trade_name, city, state')
    .eq('active', true)
    .is('archived_at', null)
    .order('trade_name');
  if (error) throw new Error(error.message);
  return (data ?? []) as {
    id: string;
    trade_name: string;
    city: string | null;
    state: string | null;
  }[];
}
