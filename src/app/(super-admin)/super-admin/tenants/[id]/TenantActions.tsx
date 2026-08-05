'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  suspendTenantAction,
  reactivateTenantAction,
  changeTenantPlanAction
} from '@/features/platform/tenant-actions';
import { startImpersonationAction } from '@/features/impersonation/actions';
import type { PlanRow } from '@/features/platform/queries';

export function TenantActions({
  tenantId,
  currentPlanId,
  plans,
  status
}: {
  tenantId: string;
  currentPlanId: string | null;
  plans: PlanRow[];
  status: string;
}) {
  const [selectedPlan, setSelectedPlan] = useState(currentPlanId ?? plans[0]?.id ?? '');
  const [reason, setReason] = useState('');
  const [pending, start] = useTransition();

  const suspend = () => {
    if (!reason.trim()) {
      toast.error('Informe um motivo para suspender.');
      return;
    }
    start(async () => {
      const res = await suspendTenantAction(tenantId, reason);
      if (!res.ok) {
        toast.error(res.error ?? 'Falha ao suspender.');
        return;
      }
      toast.success('Tenant suspenso.');
    });
  };

  const reactivate = () => {
    start(async () => {
      const res = await reactivateTenantAction(tenantId);
      if (!res.ok) {
        toast.error(res.error ?? 'Falha ao reativar.');
        return;
      }
      toast.success('Tenant reativado.');
    });
  };

  const changePlan = () => {
    if (!selectedPlan) {
      toast.error('Selecione um plano.');
      return;
    }
    start(async () => {
      const res = await changeTenantPlanAction(tenantId, selectedPlan);
      if (!res.ok) {
        toast.error(res.error ?? 'Falha ao alterar plano.');
        return;
      }
      toast.success('Plano alterado.');
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gold/15 bg-gold/[0.03] p-5">
      <h2 className="text-sm text-white">Ações administrativas</h2>

      <div className="flex flex-col gap-2">
        <label className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">
          Alterar plano
        </label>
        <div className="flex gap-2">
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="h-10 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {formatBRL(p.monthly_price)}/mês
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={changePlan}
            disabled={pending || selectedPlan === currentPlanId}
            className="rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 disabled:opacity-50"
          >
            Aplicar
          </button>
        </div>
      </div>

      <div className="border-t border-white/10 pt-4">
        <label className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">Motivo</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex.: inadimplência · abuso"
          className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none"
        />
        <div className="mt-3 flex gap-2">
          {status !== 'suspended' && (
            <button
              type="button"
              onClick={suspend}
              disabled={pending}
              className="rounded-full border border-red-400/40 bg-red-400/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-red-200 hover:border-red-400/70 disabled:opacity-50"
            >
              Suspender
            </button>
          )}
          {status === 'suspended' && (
            <button
              type="button"
              onClick={reactivate}
              disabled={pending}
              className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-emerald-200 hover:border-emerald-400/70 disabled:opacity-50"
            >
              Reativar
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (!reason.trim()) {
                toast.error('Informe um motivo para impersonar.');
                return;
              }
              start(async () => {
                const res = await startImpersonationAction({ tenantId, reason });
                if (!res.ok) toast.error(res.error ?? 'Falha ao impersonar.');
              });
            }}
            disabled={pending}
            className="rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-yellow-100 hover:border-yellow-400/70 disabled:opacity-50"
          >
            Impersonar
          </button>
        </div>
      </div>
    </div>
  );
}

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
