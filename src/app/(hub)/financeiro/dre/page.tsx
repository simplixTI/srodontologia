import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { listDreCurrentYear } from '@/features/finance-v2/queries';

export const metadata: Metadata = { title: 'DRE · Financeiro' };
export const dynamic = 'force-dynamic';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function DrePage() {
  const rows = await listDreCurrentYear();

  const byMonth = new Map<string, { revenues: Map<string, number>; expenses: Map<string, number> }>();
  for (const r of rows) {
    const m = r.month;
    const bucket = byMonth.get(m) ?? { revenues: new Map(), expenses: new Map() };
    if (r.kind === 'income') bucket.revenues.set(r.category, Number(r.total));
    else bucket.expenses.set(r.category, Number(r.total));
    byMonth.set(m, bucket);
  }

  const months = Array.from(byMonth.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/financeiro"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>
      <header>
        <h1 className="font-display text-3xl text-white md:text-4xl">DRE mensal simplificado</h1>
        <p className="mt-2 text-sm text-white/60">
          Receitas e despesas por categoria dos últimos 12 meses. Baseado em `fin_transactions`.
        </p>
      </header>

      {months.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 p-14 text-center text-sm text-white/40">
          Sem transações no período.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {months.map((month) => {
            const bucket = byMonth.get(month)!;
            const revenues = Array.from(bucket.revenues.entries());
            const expenses = Array.from(bucket.expenses.entries());
            const totalRev = revenues.reduce((a, [, v]) => a + v, 0);
            const totalExp = expenses.reduce((a, [, v]) => a + v, 0);
            const net = totalRev - totalExp;
            return (
              <section
                key={month}
                className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5"
              >
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="font-display text-lg text-white">
                    {new Date(month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </h2>
                  <span className={'font-mono ' + (net >= 0 ? 'text-emerald-200' : 'text-red-200')}>
                    {net >= 0 ? '+' : ''}
                    {fmt(net)}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-[0.6rem] uppercase tracking-[0.28em] text-emerald-200">
                      Receitas ({fmt(totalRev)})
                    </div>
                    {revenues.length === 0 ? (
                      <div className="text-xs text-white/40">Sem receitas.</div>
                    ) : (
                      <ul className="space-y-1">
                        {revenues.map(([cat, val]) => (
                          <li key={cat} className="flex justify-between text-xs">
                            <span className="text-white/70">{cat}</span>
                            <span className="font-mono text-emerald-200">{fmt(val)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <div className="mb-2 text-[0.6rem] uppercase tracking-[0.28em] text-red-200">
                      Despesas ({fmt(totalExp)})
                    </div>
                    {expenses.length === 0 ? (
                      <div className="text-xs text-white/40">Sem despesas.</div>
                    ) : (
                      <ul className="space-y-1">
                        {expenses.map(([cat, val]) => (
                          <li key={cat} className="flex justify-between text-xs">
                            <span className="text-white/70">{cat}</span>
                            <span className="font-mono text-red-200">{fmt(val)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
