import type { Metadata } from 'next';
import Link from 'next/link';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import {
  getKpis,
  getPayablesSummary,
  listCashFlow,
  listTransactions
} from '@/features/finance-v2/queries';
import { CashFlowChart } from './CashFlowChart';

export const metadata: Metadata = { title: 'Financeiro · SR HUB' };
export const dynamic = 'force-dynamic';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function FinanceiroPage() {
  const [kpis, cashflow, payables, txns] = await Promise.all([
    getKpis(),
    listCashFlow(),
    getPayablesSummary(),
    listTransactions(20)
  ]);

  const netMtd = Number(kpis?.income_mtd ?? 0) - Number(kpis?.expense_mtd ?? 0);
  const net30d = Number(kpis?.income_30d ?? 0) - Number(kpis?.expense_30d ?? 0);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Fluxo · Financeiro
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">Financeiro</h1>
            <p className="mt-3 max-w-2xl text-white/60">
              Contas a pagar, receber, fluxo de caixa, comissões e DRE.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/financeiro/pagar"
              className="btn-outline-gold inline-flex h-10 items-center gap-2 rounded-full px-4 text-[0.65rem] uppercase tracking-[0.22em]"
            >
              Contas a pagar
            </Link>
            <Link
              href="/financeiro/comissoes"
              className="btn-outline-gold inline-flex h-10 items-center gap-2 rounded-full px-4 text-[0.65rem] uppercase tracking-[0.22em]"
            >
              Comissões
            </Link>
            <Link
              href="/financeiro/dre"
              className="btn-outline-gold inline-flex h-10 items-center gap-2 rounded-full px-4 text-[0.65rem] uppercase tracking-[0.22em]"
            >
              DRE
            </Link>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiTile
          label="Receita 30d"
          value={fmt(Number(kpis?.income_30d ?? 0))}
          tone="emerald"
          icon={<TrendingUp className="h-3 w-3" strokeWidth={1.5} />}
        />
        <KpiTile
          label="Despesa 30d"
          value={fmt(Number(kpis?.expense_30d ?? 0))}
          tone="red"
          icon={<TrendingDown className="h-3 w-3" strokeWidth={1.5} />}
        />
        <KpiTile
          label="Resultado 30d"
          value={fmt(net30d)}
          tone={net30d >= 0 ? 'emerald' : 'red'}
          icon={<DollarSign className="h-3 w-3" strokeWidth={1.5} />}
        />
        <KpiTile
          label={`A pagar (${payables?.overdue_count ?? 0} vencidos)`}
          value={fmt(Number(payables?.total_amount ?? 0))}
          tone={Number(payables?.overdue_count ?? 0) > 0 ? 'red' : undefined}
          icon={<AlertCircle className="h-3 w-3" strokeWidth={1.5} />}
        />
      </div>

      <section className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">Fluxo de caixa (90d)</h2>
          <div className="flex gap-4 text-[0.6rem] uppercase tracking-[0.22em] text-white/50">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Receita
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-400" /> Despesa
            </span>
          </div>
        </div>
        <CashFlowChart data={cashflow} />
      </section>

      <section>
        <h2 className="mb-3 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">
          Últimas transações
        </h2>
        {txns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">
            Sem transações registradas ainda.
          </div>
        ) : (
          <ul className="space-y-1">
            {txns.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-xl border border-gold/10 bg-white/[0.02] px-4 py-3"
              >
                <span
                  className={
                    'flex h-8 w-8 items-center justify-center rounded-full ' +
                    (t.kind === 'income'
                      ? 'bg-emerald-400/10 text-emerald-200'
                      : 'bg-red-400/10 text-red-200')
                  }
                >
                  {t.kind === 'income' ? '+' : '−'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-white">
                    {t.description ?? (t.kind === 'income' ? 'Receita' : 'Despesa')}
                  </div>
                  <div className="text-[0.6rem] text-white/40">
                    {new Date(t.txn_date).toLocaleDateString('pt-BR')}
                    {t.source_type && ` · ${t.source_type}`}
                  </div>
                </div>
                <div
                  className={
                    'font-mono text-sm ' +
                    (t.kind === 'income' ? 'text-emerald-200' : 'text-red-200')
                  }
                >
                  {t.kind === 'income' ? '+' : '−'} {fmt(Number(t.amount))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function KpiTile({
  label,
  value,
  tone,
  icon
}: {
  label: string;
  value: string;
  tone?: 'emerald' | 'red';
  icon?: React.ReactNode;
}) {
  const color = tone === 'emerald' ? 'text-emerald-200' : tone === 'red' ? 'text-red-200' : 'text-white';
  return (
    <div className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-[0.55rem] uppercase tracking-[0.28em] text-white/50">
        {icon}
        {label}
      </div>
      <div className={`mt-2 truncate font-display text-2xl ${color}`}>{value}</div>
    </div>
  );
}
