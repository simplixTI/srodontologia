import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3, Download } from 'lucide-react';
import { REPORT_LABELS, type ReportKey } from '@/features/reports/types';

export const metadata: Metadata = { title: 'Relatórios · SR HUB' };
export const dynamic = 'force-dynamic';

const GROUPS: Array<{ label: string; keys: ReportKey[] }> = [
  {
    label: 'Casos',
    keys: ['cases_by_status', 'health_distribution', 'dentist_activity']
  },
  {
    label: 'Produção',
    keys: ['production_throughput', 'stage_avg_time', 'technician_productivity']
  },
  {
    label: 'Qualidade',
    keys: ['qc_pass_rate']
  },
  {
    label: 'Entregas',
    keys: ['deliveries_on_time', 'deliveries_by_carrier']
  },
  {
    label: 'Financeiro',
    keys: ['revenue_by_month', 'top_expense_categories', 'commission_paid']
  }
];

export default function RelatoriosPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Estúdio · BI</div>
        <h1 className="mt-2 font-display text-4xl leading-tight text-white md:text-5xl">
          Relatórios & Analytics
        </h1>
        <p className="mt-2 max-w-3xl text-white/60">
          Relatórios pré-fabricados prontos para consulta. Cada relatório também pode ser
          baixado em CSV. Baseado em views RLS-safe.
        </p>
      </header>

      {GROUPS.map((g) => (
        <section key={g.label}>
          <h2 className="mb-3 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">
            {g.label}
          </h2>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {g.keys.map((k) => (
              <li key={k} className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4 hover:border-gold/30">
                <Link href={`/relatorios/${k}`} className="block">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm text-white">
                        <BarChart3 className="h-4 w-4 text-gold-300" strokeWidth={1.5} />
                        {REPORT_LABELS[k]}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-gold/20 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.22em] text-gold-100">
                      <Download className="h-2.5 w-2.5" strokeWidth={1.5} /> CSV
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
