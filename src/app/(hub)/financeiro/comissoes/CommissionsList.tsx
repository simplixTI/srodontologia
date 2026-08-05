'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  deleteCommissionAction,
  transitionCommissionAction
} from '@/features/finance-v2/actions';
import type { CommissionStatus, CommissionWithMeta } from '@/features/finance-v2/types';
import { COMMISSION_STATUS_LABELS } from '@/features/finance-v2/types';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_STYLES: Record<CommissionStatus, string> = {
  pending: 'border-white/20 text-white/60',
  approved: 'border-blue-400/40 text-blue-200 bg-blue-400/10',
  paid: 'border-emerald-400/40 text-emerald-200 bg-emerald-400/10',
  cancelled: 'border-white/10 text-white/40'
};

export function CommissionsList({ initialCommissions }: { initialCommissions: CommissionWithMeta[] }) {
  const [commissions, setCommissions] = useState<CommissionWithMeta[]>(initialCommissions);
  const [pending, startTransition] = useTransition();

  function transition(id: string, target: 'approved' | 'paid' | 'cancelled') {
    startTransition(async () => {
      try {
        await transitionCommissionAction({ commission_id: id, target });
        setCommissions((s) =>
          s.map((c) => (c.id === id ? { ...c, status: target as CommissionStatus } : c))
        );
        toast.success('Status atualizado');
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  function remove(id: string) {
    if (!confirm('Remover esta comissão?')) return;
    startTransition(async () => {
      try {
        await deleteCommissionAction(id);
        setCommissions((s) => s.filter((c) => c.id !== id));
        toast.success('Removida');
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  if (commissions.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 p-14 text-center text-sm text-white/40">
        Nenhuma comissão registrada.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {commissions.map((c) => (
        <li key={c.id} className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm text-white">{c.beneficiary_name ?? '(sem beneficiário)'}</div>
              <div className="mt-0.5 text-[0.65rem] text-white/50">
                Base: {fmt(Number(c.base_amount))} × {Number(c.percentage)}%
                {c.invoice_number && ` · Fatura ${c.invoice_number}`}
                {c.reference_month && ` · Mês ${new Date(c.reference_month).toLocaleDateString('pt-BR')}`}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg text-white">{fmt(Number(c.amount))}</div>
              <span
                className={
                  'mt-1 inline-block rounded-full border px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.2em] ' +
                  STATUS_STYLES[c.status]
                }
              >
                {COMMISSION_STATUS_LABELS[c.status]}
              </span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {c.status === 'pending' && (
              <button
                type="button"
                disabled={pending}
                onClick={() => transition(c.id, 'approved')}
                className="h-8 rounded-full border border-blue-400/40 bg-blue-400/10 px-3 text-[0.55rem] uppercase tracking-[0.2em] text-blue-200 hover:bg-blue-400/20"
              >
                Aprovar
              </button>
            )}
            {c.status === 'approved' && (
              <button
                type="button"
                disabled={pending}
                onClick={() => transition(c.id, 'paid')}
                className="btn-gold h-8 rounded-full px-3 text-[0.55rem] uppercase tracking-[0.2em]"
              >
                Registrar pagamento
              </button>
            )}
            {c.status !== 'cancelled' && c.status !== 'paid' && (
              <button
                type="button"
                disabled={pending}
                onClick={() => transition(c.id, 'cancelled')}
                className="h-8 rounded-full border border-white/10 px-3 text-[0.55rem] uppercase tracking-[0.2em] text-white/60 hover:border-white/30"
              >
                Cancelar
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => remove(c.id)}
              className="ml-auto h-8 rounded-full border border-red-400/30 px-3 text-[0.55rem] uppercase tracking-[0.2em] text-red-300/70 hover:text-red-300"
            >
              Excluir
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
