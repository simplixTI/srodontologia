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
  // Cases metrics
  casesTotal: number;
  casesInProgress: number;
  casesOverdue: number;
  casesCompleted: number;
  casesDrafts: number;
  casesByStatus: { status: string; count: number }[];
  casesLast30d: { day: string; count: number }[];
  // Financials
  revenueThisMonth: number;
  revenueLast6Months: { month: string; total: number }[];
  quotesApprovedCount: number;
  quotesSentCount: number;
  // Rankings
  topDentistsByCases: { dentist_id: string; name: string; count: number }[];
  topCaseTypes: { name: string; count: number }[];
  // Timeline
  recentActivities: {
    id: string | number;
    kind: 'case_created' | 'status_change' | 'quote_approved' | 'delivery_delivered';
    when: string;
    title: string;
    subtitle?: string;
    href?: string;
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

function isoDayBucket(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function isoMonthBucket(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createSupabaseServerClient();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000).toISOString();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 86400_000).toISOString();
  const monthStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1).toISOString();

  const [
    clinicsRes,
    dentistsRes,
    leadsRes,
    recentLeadsRes,
    recentDentistsRes,
    allCasesRes,
    cases30dRes,
    quotesRes,
    approvedQuotes6mRes,
    revenueMonthRes,
    caseTypesRes,
    caseStatusChangesRes
  ] = await Promise.all([
    supabase.from('clinics').select('id', { count: 'exact', head: true }).eq('active', true).is('archived_at', null),
    supabase.from('dentists').select('id, customer_status', { count: 'exact' }).is('archived_at', null),
    supabase.from('leads').select('id, pipeline_stage, converted_dentist_id').is('archived_at', null),
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
      .limit(5),
    supabase
      .from('cases')
      .select(
        'id, case_number, title, internal_status, dentist_id, case_type_id, requested_delivery_date, estimated_delivery_date, actual_delivery_date, created_at, dentist:dentists(id, full_name), case_type:case_types(id, name)'
      )
      .is('archived_at', null),
    supabase
      .from('cases')
      .select('id, created_at')
      .is('archived_at', null)
      .gte('created_at', thirtyDaysAgo),
    supabase
      .from('quotes')
      .select('id, status, total, approved_at, sent_at, case_id')
      .in('status', ['sent', 'approved']),
    supabase
      .from('quotes')
      .select('total, approved_at')
      .eq('status', 'approved')
      .not('approved_at', 'is', null)
      .gte('approved_at', sixMonthsAgo),
    supabase
      .from('quotes')
      .select('total')
      .eq('status', 'approved')
      .not('approved_at', 'is', null)
      .gte('approved_at', monthStart),
    supabase.from('case_types').select('id, name'),
    supabase
      .from('case_status_history')
      .select(
        'id, case_id, new_public_status, previous_public_status, created_at, changer:profiles!changed_by(id, full_name)'
      )
      .order('created_at', { ascending: false })
      .limit(15)
  ]);

  // Clinics / dentists / customer buckets
  const clinicsActive = clinicsRes.count ?? 0;
  const dentistsRaw = (dentistsRes.data ?? []) as {
    id: string;
    customer_status: CustomerStatus;
  }[];
  const dentistsActive = dentistsRes.count ?? 0;
  const activeCustomers = dentistsRaw.filter((d) => d.customer_status === 'active_customer').length;
  const premiumCustomers = dentistsRaw.filter((d) => d.customer_status === 'premium_customer').length;

  // Leads
  const leadsRaw = (leadsRes.data ?? []) as {
    id: string;
    pipeline_stage: CustomerStatus;
    converted_dentist_id: string | null;
  }[];
  const pipelineDistribution = { ...emptyDistribution };
  for (const l of leadsRaw) {
    pipelineDistribution[l.pipeline_stage] = (pipelineDistribution[l.pipeline_stage] ?? 0) + 1;
  }
  const leadsTotal = leadsRaw.length;
  const leadsConverted = leadsRaw.filter((l) => l.converted_dentist_id).length;
  const leadsOpen = leadsRaw.filter((l) => !l.converted_dentist_id && l.pipeline_stage !== 'lost').length;

  // Cases
  type CaseAgg = {
    id: string;
    case_number: string;
    title: string;
    internal_status: string;
    dentist_id: string;
    case_type_id: string | null;
    requested_delivery_date: string | null;
    estimated_delivery_date: string | null;
    actual_delivery_date: string | null;
    created_at: string;
    dentist: { id: string; full_name: string } | null;
    case_type: { id: string; name: string } | null;
  };
  const cases = (allCasesRes.data ?? []) as unknown as CaseAgg[];
  const casesTotal = cases.length;
  const casesDrafts = cases.filter((c) => c.internal_status === 'draft').length;
  const casesCompleted = cases.filter((c) => c.internal_status === 'completed').length;
  const casesInProgress = cases.filter(
    (c) => !['draft', 'completed', 'cancelled', 'delivered'].includes(c.internal_status)
  ).length;

  // Overdue: no actual_delivery + target date passed and status not terminal
  const todayISO = new Date();
  todayISO.setUTCHours(0, 0, 0, 0);
  const casesOverdue = cases.filter((c) => {
    if (c.actual_delivery_date) return false;
    if (['completed', 'cancelled', 'delivered'].includes(c.internal_status)) return false;
    const target = c.estimated_delivery_date ?? c.requested_delivery_date;
    if (!target) return false;
    return new Date(target) < todayISO;
  }).length;

  // Cases by status (for chart)
  const statusMap = new Map<string, number>();
  for (const c of cases) statusMap.set(c.internal_status, (statusMap.get(c.internal_status) ?? 0) + 1);
  const casesByStatus = Array.from(statusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // Cases last 30d (daily buckets)
  const day30 = new Map<string, number>();
  // Fill zeros for all days
  for (let i = 0; i < 30; i++) {
    const d = new Date(now.getTime() - i * 86400_000);
    day30.set(isoDayBucket(d.toISOString()), 0);
  }
  for (const c of (cases30dRes.data ?? []) as { created_at: string }[]) {
    const bucket = isoDayBucket(c.created_at);
    if (day30.has(bucket)) day30.set(bucket, (day30.get(bucket) ?? 0) + 1);
  }
  const casesLast30d = Array.from(day30.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, count]) => ({ day: day.slice(5), count })); // MM-DD

  // Financial
  const revenueThisMonth = ((revenueMonthRes.data ?? []) as { total: number }[]).reduce(
    (s, r) => s + Number(r.total ?? 0),
    0
  );
  const monthMap = new Map<string, number>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - i, 1);
    monthMap.set(isoMonthBucket(d.toISOString()), 0);
  }
  for (const q of (approvedQuotes6mRes.data ?? []) as { approved_at: string; total: number }[]) {
    const bucket = isoMonthBucket(q.approved_at);
    if (monthMap.has(bucket)) {
      monthMap.set(bucket, (monthMap.get(bucket) ?? 0) + Number(q.total ?? 0));
    }
  }
  const revenueLast6Months = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, total]) => ({ month, total }));

  const quotesRaw = (quotesRes.data ?? []) as { status: string }[];
  const quotesApprovedCount = quotesRaw.filter((q) => q.status === 'approved').length;
  const quotesSentCount = quotesRaw.filter((q) => q.status === 'sent').length;

  // Rankings
  const dentistCount = new Map<string, number>();
  const dentistName = new Map<string, string>();
  for (const c of cases) {
    if (!c.dentist_id) continue;
    dentistCount.set(c.dentist_id, (dentistCount.get(c.dentist_id) ?? 0) + 1);
    if (c.dentist?.full_name) dentistName.set(c.dentist_id, c.dentist.full_name);
  }
  const topDentistsByCases = Array.from(dentistCount.entries())
    .map(([dentist_id, count]) => ({ dentist_id, name: dentistName.get(dentist_id) ?? '—', count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const typeCount = new Map<string, number>();
  const typeNames = new Map<string, string>();
  for (const ct of (caseTypesRes.data ?? []) as { id: string; name: string }[]) {
    typeNames.set(ct.id, ct.name);
  }
  for (const c of cases) {
    if (!c.case_type_id) continue;
    typeCount.set(c.case_type_id, (typeCount.get(c.case_type_id) ?? 0) + 1);
  }
  const topCaseTypes = Array.from(typeCount.entries())
    .map(([id, count]) => ({ name: typeNames.get(id) ?? '—', count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Recent activities from case_status_history
  type StatusChangeRow = {
    id: number;
    case_id: string;
    new_public_status: string | null;
    previous_public_status: string | null;
    created_at: string;
    changer: { id: string; full_name: string } | null;
  };
  const changes = (caseStatusChangesRes.data ?? []) as unknown as StatusChangeRow[];
  const casesById = new Map(cases.map((c) => [c.id, c]));
  const recentActivities = changes.map((s) => {
    const caseRow = casesById.get(s.case_id);
    return {
      id: s.id,
      kind: (s.previous_public_status ? 'status_change' : 'case_created') as
        | 'case_created'
        | 'status_change',
      when: s.created_at,
      title: caseRow
        ? `${caseRow.case_number} · ${s.new_public_status ?? '—'}`
        : (s.new_public_status ?? '—'),
      subtitle: caseRow?.title ?? undefined,
      href: caseRow ? `/casos/${caseRow.id}` : undefined
    };
  });

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
    recentDentists: (recentDentistsRes.data ?? []) as DashboardStats['recentDentists'],
    casesTotal,
    casesInProgress,
    casesOverdue,
    casesCompleted,
    casesDrafts,
    casesByStatus,
    casesLast30d,
    revenueThisMonth,
    revenueLast6Months,
    quotesApprovedCount,
    quotesSentCount,
    topDentistsByCases,
    topCaseTypes,
    recentActivities
  };
}
