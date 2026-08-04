import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CustomerStatus } from '@/lib/validations/dentists';

export type DashboardStats = {
  clinicsActive: number;
  dentistsActive: number;
  leadsTotal: number;
  leadsOpen: number;
  leadsConverted: number;
  activeCustomers: number;
  premiumCustomers: number;
  pipelineDistribution: Record<CustomerStatus, number>;
  recentLeads: {
    id: string;
    full_name: string;
    pipeline_stage: CustomerStatus;
    created_at: string;
  }[];
  recentDentists: {
    id: string;
    full_name: string;
    customer_status: CustomerStatus;
    created_at: string;
  }[];
};

const emptyDistribution: Record<CustomerStatus, number> = {
  lead: 0,
  contacted: 0,
  presentation_scheduled: 0,
  presentation_completed: 0,
  first_case: 0,
  active_customer: 0,
  premium_customer: 0,
  inactive_customer: 0,
  lost: 0
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createSupabaseServerClient();

  const [clinicsRes, dentistsRes, leadsRes, recentLeadsRes, recentDentistsRes] =
    await Promise.all([
      supabase
        .from('clinics')
        .select('id', { count: 'exact', head: true })
        .eq('active', true)
        .is('archived_at', null),
      supabase
        .from('dentists')
        .select('id, customer_status', { count: 'exact' })
        .is('archived_at', null),
      supabase
        .from('leads')
        .select('id, pipeline_stage, converted_dentist_id')
        .is('archived_at', null),
      supabase
        .from('leads')
        .select('id, full_name, pipeline_stage, created_at')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('dentists')
        .select('id, full_name, customer_status, created_at')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

  const clinicsActive = clinicsRes.count ?? 0;
  const dentistsRaw = (dentistsRes.data ?? []) as {
    id: string;
    customer_status: CustomerStatus;
  }[];
  const dentistsActive = dentistsRes.count ?? 0;
  const activeCustomers = dentistsRaw.filter(
    (d) => d.customer_status === 'active_customer'
  ).length;
  const premiumCustomers = dentistsRaw.filter(
    (d) => d.customer_status === 'premium_customer'
  ).length;

  const leadsRaw = (leadsRes.data ?? []) as {
    id: string;
    pipeline_stage: CustomerStatus;
    converted_dentist_id: string | null;
  }[];

  const pipelineDistribution = { ...emptyDistribution };
  for (const l of leadsRaw) {
    pipelineDistribution[l.pipeline_stage] =
      (pipelineDistribution[l.pipeline_stage] ?? 0) + 1;
  }

  const leadsTotal = leadsRaw.length;
  const leadsConverted = leadsRaw.filter((l) => l.converted_dentist_id).length;
  const leadsOpen = leadsRaw.filter(
    (l) => !l.converted_dentist_id && l.pipeline_stage !== 'lost'
  ).length;

  return {
    clinicsActive,
    dentistsActive,
    leadsTotal,
    leadsOpen,
    leadsConverted,
    activeCustomers,
    premiumCustomers,
    pipelineDistribution,
    recentLeads: (recentLeadsRes.data ?? []) as DashboardStats['recentLeads'],
    recentDentists: (recentDentistsRes.data ?? []) as DashboardStats['recentDentists']
  };
}
