'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { startCheckoutAction } from '@/features/billing/actions';
import type { PlanRow } from '@/features/platform/queries';

export function BillingPanel({
  plans,
  currentPlanCode
}: {
  plans: PlanRow[];
  currentPlanCode: string | null;
}) {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [pending, start] = useTransition();

  const checkout = (code: string) => {
    start(async () => {
      const res = await startCheckoutAction({ plan_code: code, cycle });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha.');
        return;
      }
      window.location.href = res.hostedUrl;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <div className="inline-flex overflow-hidden rounded-full border border-white/15 bg-black/40 p-0.5">
          <button
            type="button"
            onClick={() => setCycle('monthly')}
            className={
              cycle === 'monthly'
                ? 'rounded-full bg-gold/20 px-4 py-1.5 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100'
                : 'rounded-full px-4 py-1.5 text-[0.55rem] uppercase tracking-[0.28em] text-white/60'
            }
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setCycle('yearly')}
            className={
              cycle === 'yearly'
                ? 'rounded-full bg-gold/20 px-4 py-1.5 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100'
                : 'rounded-full px-4 py-1.5 text-[0.55rem] uppercase tracking-[0.28em] text-white/60'
            }
          >
            Anual (2 meses grátis)
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.filter((p) => p.is_public).map((p) => {
          const price = cycle === 'monthly' ? p.monthly_price : p.yearly_price / 12;
          const isCurrent = p.code === currentPlanCode;
          return (
            <div
              key={p.id}
              className={
                isCurrent
                  ? 'rounded-2xl border border-gold/40 bg-gold/[0.05] p-5'
                  : 'rounded-2xl border border-white/10 bg-white/[0.02] p-5'
              }
            >
              <div className="text-[0.55rem] uppercase tracking-[0.28em] text-gold-100">{p.code}</div>
              <h3 className="mt-1 font-display text-xl text-white">{p.name}</h3>
              <div className="mt-3 text-2xl text-white">
                {price > 0
                  ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  : 'Sob consulta'}
                <span className="text-xs text-white/40"> /mês</span>
              </div>
              <p className="mt-2 min-h-[2.5em] text-xs text-white/60">{p.description}</p>
              <button
                type="button"
                onClick={() => checkout(p.code)}
                disabled={pending || isCurrent || p.monthly_price === 0}
                className="mt-4 w-full rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 disabled:opacity-50"
              >
                {isCurrent ? 'Seu plano atual' : p.monthly_price === 0 ? 'Fale conosco' : 'Assinar'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
