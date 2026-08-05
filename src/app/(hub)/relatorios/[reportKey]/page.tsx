import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
import {
  listCasesByStatus,
  listCommissionPaid,
  listDeliveriesByCarrier,
  listDeliveriesOnTime,
  listDentistActivity,
  listHealthDistribution,
  listProductionThroughput,
  listQcPassRate,
  listRevenueByMonth,
  listStageAvgTime,
  listTechnicianProductivity,
  listTopExpenseCategories
} from '@/features/reports/queries';
import { REPORT_LABELS, type ReportKey } from '@/features/reports/types';

export const metadata: Metadata = { title: 'Relatório · SR HUB' };
export const dynamic = 'force-dynamic';

const LOADERS: Record<ReportKey, () => Promise<Array<Record<string, unknown>>>> = {
  cases_by_status: () => listCasesByStatus() as Promise<Array<Record<string, unknown>>>,
  health_distribution: () => listHealthDistribution() as Promise<Array<Record<string, unknown>>>,
  production_throughput: () => listProductionThroughput() as Promise<Array<Record<string, unknown>>>,
  stage_avg_time: () => listStageAvgTime() as Promise<Array<Record<string, unknown>>>,
  technician_productivity: () =>
    listTechnicianProductivity() as Promise<Array<Record<string, unknown>>>,
  qc_pass_rate: () => listQcPassRate() as Promise<Array<Record<string, unknown>>>,
  deliveries_on_time: () => listDeliveriesOnTime() as Promise<Array<Record<string, unknown>>>,
  deliveries_by_carrier: () => listDeliveriesByCarrier() as Promise<Array<Record<string, unknown>>>,
  revenue_by_month: () => listRevenueByMonth() as Promise<Array<Record<string, unknown>>>,
  top_expense_categories: () => listTopExpenseCategories() as Promise<Array<Record<string, unknown>>>,
  commission_paid: () => listCommissionPaid() as Promise<Array<Record<string, unknown>>>,
  dentist_activity: () => listDentistActivity() as Promise<Array<Record<string, unknown>>>
};

export default async function ReportPage({ params }: { params: { reportKey: string } }) {
  const key = params.reportKey as ReportKey;
  if (!(key in LOADERS)) notFound();
  const rows = await LOADERS[key]();
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/relatorios"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>

      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl text-white md:text-4xl">{REPORT_LABELS[key]}</h1>
          <p className="mt-2 text-sm text-white/60">
            {rows.length} linha{rows.length === 1 ? '' : 's'} · atualizado agora
          </p>
        </div>
        <Link
          href={`/api/reports/${key}.csv`}
          className="btn-gold inline-flex h-10 items-center gap-2 rounded-full px-4 text-[0.65rem] uppercase tracking-[0.22em]"
        >
          <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> Baixar CSV
        </Link>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 p-14 text-center text-sm text-white/40">
          Sem dados neste relatório ainda.
        </div>
      ) : (
        <div className="overflow-auto rounded-2xl border border-gold/10 bg-white/[0.02]">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-gold/10 bg-black/40">
                {headers.map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-[0.55rem] uppercase tracking-[0.22em] text-gold-100">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                  {headers.map((h) => (
                    <td key={h} className="px-4 py-2 text-white/80">
                      {formatCell(r[h])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  if (typeof v === 'string') {
    // ISO date?
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v).toLocaleDateString('pt-BR');
    return v;
  }
  return String(v);
}
