import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CustomerStatus } from '@/lib/validations/dentists';

export type Lead = {
  id: string;
  full_name: string;
  clinic_name: string | null;
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
  pipeline_stage: CustomerStatus;
  estimated_value: number | null;
  commercial_owner_id: string | null;
  next_follow_up_at: string | null;
  lost_reason: string | null;
  notes: string | null;
  converted_dentist_id: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listLeads() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Lead[];
}
