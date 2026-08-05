import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CasePriority } from '@/lib/validations/cases';
import type { PublicCaseStatus } from '@/features/cases/queries';

export type DentistProfile = {
  id: string;
  full_name: string;
  cro_state: string | null;
  cro_number: string | null;
  primary_clinic_id: string | null;
  active: boolean;
  profile_id: string;
};

export async function getMyDentistRecord(): Promise<DentistProfile | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('dentists')
    .select('id, full_name, cro_state, cro_number, primary_clinic_id, active, profile_id')
    .eq('profile_id', user.id)
    .is('archived_at', null)
    .maybeSingle<DentistProfile>();
  return data;
}

export type PortalCaseRow = {
  id: string;
  case_number: string;
  title: string;
  priority: CasePriority;
  public_status: PublicCaseStatus;
  requested_delivery_date: string | null;
  estimated_delivery_date: string | null;
  actual_delivery_date: string | null;
  created_at: string;
  updated_at: string;
  case_type: { id: string; name: string } | null;
  clinic: { id: string; trade_name: string } | null;
};

export async function listPortalCases(opts?: {
  search?: string;
  status?: PublicCaseStatus | 'all';
}) {
  const supabase = createSupabaseServerClient();
  let q = supabase
    .from('cases')
    .select(
      'id, case_number, title, priority, public_status, requested_delivery_date, estimated_delivery_date, actual_delivery_date, created_at, updated_at, case_type:case_types(id, name), clinic:clinics(id, trade_name)'
    )
    .is('archived_at', null)
    .order('updated_at', { ascending: false });

  if (opts?.search && opts.search.trim().length > 0) {
    const s = opts.search.trim();
    q = q.or(`title.ilike.%${s}%,case_number.ilike.%${s}%`);
  }
  if (opts?.status && opts.status !== 'all') {
    q = q.eq('public_status', opts.status);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PortalCaseRow[];
}

export type PortalKpi = {
  activeCount: number;
  pendingApprovalCount: number;
  awaitingDeliveryCount: number;
  completedThisMonth: number;
};

const ACTIVE_STATUSES: PublicCaseStatus[] = [
  'submitted',
  'in_review',
  'missing_information',
  'quote_available',
  'awaiting_your_approval',
  'in_planning',
  'planning_available',
  'in_production',
  'quality_control',
  'preparing_shipment',
  'shipped'
];

export async function getPortalKpis(): Promise<PortalKpi> {
  const supabase = createSupabaseServerClient();

  const [activeQ, approvalQ, shippingQ, completedQ] = await Promise.all([
    supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .is('archived_at', null)
      .in('public_status', ACTIVE_STATUSES),
    supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .is('archived_at', null)
      .in('public_status', ['quote_available', 'awaiting_your_approval', 'planning_available']),
    supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .is('archived_at', null)
      .in('public_status', ['preparing_shipment', 'shipped']),
    supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .is('archived_at', null)
      .eq('public_status', 'completed')
      .gte('updated_at', firstDayOfMonth().toISOString())
  ]);

  return {
    activeCount: activeQ.count ?? 0,
    pendingApprovalCount: approvalQ.count ?? 0,
    awaitingDeliveryCount: shippingQ.count ?? 0,
    completedThisMonth: completedQ.count ?? 0
  };
}

function firstDayOfMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export type PortalNotification = {
  id: string;
  case_id: string | null;
  type: string;
  title: string;
  message: string | null;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
};

export async function listPortalNotifications(limit = 20): Promise<PortalNotification[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('id, case_id, type, title, message, action_url, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as PortalNotification[];
}

export async function countPortalUnread(): Promise<number> {
  const supabase = createSupabaseServerClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function listPortalRecentActivity(limit = 5) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cases')
    .select('id, case_number, title, public_status, updated_at')
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as {
    id: string;
    case_number: string;
    title: string;
    public_status: PublicCaseStatus;
    updated_at: string;
  }[];
}
