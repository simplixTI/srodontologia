'use client';

import type { CashFlowPoint } from '@/features/finance-v2/types';

type Props = { data: CashFlowPoint[] };

export function CashFlowChart({ data }: Props) {
  if (!data || data.length === 0) {
    return <div className="py-12 text-center text-sm text-white/40">Sem dados no período.</div>;
  }

  const maxAbs = Math.max(
    1,
    ...data.map((d) => Math.max(Number(d.income ?? 0), Number(d.expense ?? 0)))
  );

  return (
    <div className="overflow-x-auto">
      <div
        className="flex min-w-full items-end gap-1"
        style={{ minWidth: `${Math.max(600, data.length * 12)}px`, height: '180px' }}
      >
        {data.map((p) => {
          const income = Number(p.income ?? 0);
          const expense = Number(p.expense ?? 0);
          const incomeH = (income / maxAbs) * 80;
          const expenseH = (expense / maxAbs) * 80;
          return (
            <div key={p.txn_date} className="flex flex-1 flex-col items-center gap-0.5">
              <div
                className="w-full rounded-sm bg-emerald-400/60"
                style={{ height: `${incomeH}%` }}
                title={`${p.txn_date} · Receita: ${income}`}
              />
              <div
                className="w-full rounded-sm bg-red-400/60"
                style={{ height: `${expenseH}%` }}
                title={`${p.txn_date} · Despesa: ${expense}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[0.55rem] text-white/40">
        <span>{data[0]?.txn_date}</span>
        <span>{data[data.length - 1]?.txn_date}</span>
      </div>
    </div>
  );
}
