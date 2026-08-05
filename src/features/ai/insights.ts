import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type LabInsights = { summary: string; raw: Record<string, unknown> };

/**
 * Returns a compact plain-text summary of authoritative metrics an LLM
 * can reference when answering executive questions. Runs cheap aggregate
 * queries; never joins large tables.
 */
export async function queryLabInsights(organizationId: string, _question: string): Promise<LabInsights> {
  const admin = createSupabaseAdminClient();

  const nowIso = new Date().toISOString();
  const monthStart = firstOfMonthIso();
  const yesterdayIso = new Date(Date.now() - 24 * 3600_000).toISOString();

  const [overdue, activeCases, thisMonthDelivered, topClients, byType] = await Promise.all([
    admin
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .lt('estimated_delivery_date', nowIso.slice(0, 10))
      .not('internal_status', 'in', '(delivered,cancelled)'),
    admin
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .not('internal_status', 'in', '(delivered,cancelled)'),
    admin
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('actual_delivery_date', monthStart)
      .not('actual_delivery_date', 'is', null),
    admin
      .from('cases')
      .select('clinic_id, clinics(trade_name)')
      .eq('organization_id', organizationId)
      .gte('created_at', monthStart)
      .limit(200),
    admin
      .from('cases')
      .select('case_type_id, case_types(name)')
      .eq('organization_id', organizationId)
      .gte('created_at', monthStart)
      .limit(200)
  ]);

  const _ = yesterdayIso; // reserved for future incident detection
  void _;

  const topClientsAgg = countBy(
    (topClients.data ?? []) as { clinic_id: string | null; clinics: { trade_name?: string } | null }[],
    (r) => r.clinics?.trade_name ?? '(sem clínica)'
  );
  const byTypeAgg = countBy(
    (byType.data ?? []) as { case_type_id: string | null; case_types: { name?: string } | null }[],
    (r) => r.case_types?.name ?? '(sem tipo)'
  );

  const raw = {
    activeCases: activeCases.count ?? 0,
    overdue: overdue.count ?? 0,
    thisMonthDelivered: thisMonthDelivered.count ?? 0,
    topClientsThisMonth: topClientsAgg.slice(0, 5),
    byTypeThisMonth: byTypeAgg.slice(0, 5)
  };

  const summary = [
    `Casos ativos (não entregues/cancelados): ${raw.activeCases}`,
    `Casos atrasados (previsão < hoje e não entregues): ${raw.overdue}`,
    `Entregues no mês corrente: ${raw.thisMonthDelivered}`,
    `Clientes com mais casos abertos no mês:`,
    ...raw.topClientsThisMonth.map((c, i) => `  ${i + 1}. ${c.key} · ${c.count}`),
    `Tipos de trabalho mais recorrentes no mês:`,
    ...raw.byTypeThisMonth.map((c, i) => `  ${i + 1}. ${c.key} · ${c.count}`)
  ].join('\n');

  return { summary, raw };
}

function countBy<T>(rows: T[], key: (r: T) => string): { key: string; count: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return Array.from(m.entries())
    .map(([k, v]) => ({ key: k, count: v }))
    .sort((a, b) => b.count - a.count);
}

function firstOfMonthIso(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}
