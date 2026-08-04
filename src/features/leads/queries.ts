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

export async function getLead(id: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .maybeSingle<Lead>();
  if (error) throw new Error(error.message);
  return data;
}

export type LeadActivity = {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  result: string | null;
  completed_at: string | null;
  created_at: string;
  user: { id: string; full_name: string } | null;
};

export async function getLeadActivities(leadId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('lead_activities')
    .select('id, activity_type, title, description, result, completed_at, created_at, user:profiles!user_id(id, full_name)')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as LeadActivity[];
}
