'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useFormState } from 'react-dom';
import {
  createCostCenterAction,
  deleteCostCenterAction,
  type ActionState
} from '@/features/finance-v2/actions';
import type { CostCenter } from '@/features/finance-v2/types';

const initial: ActionState = { ok: false };

export function CostCentersPanel({ initialItems }: { initialItems: CostCenter[] }) {
  const [items, setItems] = useState<CostCenter[]>(initialItems);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, formAction] = useFormState(createCostCenterAction, initial);

  function remove(id: string) {
    if (!confirm('Remover este centro de custo?')) return;
    startTransition(async () => {
      try {
        await deleteCostCenterAction(id);
        setItems((s) => s.filter((x) => x.id !== id));
        toast.success('Removido');
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.28em] text-white/60">
          {items.length} centro{items.length === 1 ? '' : 's'}
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="btn-gold inline-flex h-9 items-center gap-2 rounded-full px-4 text-[0.65rem] uppercase tracking-[0.22em]"
        >
          <Plus className="h-3 w-3" strokeWidth={2} /> Novo
        </button>
      </div>

      {creating && (
        <form
          action={(fd) => {
            formAction(fd);
            setTimeout(() => location.reload(), 300);
          }}
          className="rounded-2xl border border-gold/20 bg-white/[0.03] p-5"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-white/60">
              Nome *
              <input name="name" required className="input-dark h-9 rounded-xl px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/60">
              Código
              <input name="code" className="input-dark h-9 rounded-xl px-3 text-sm" />
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1 text-xs text-white/60">
            Descrição
            <textarea name="description" rows={3} className="input-dark rounded-xl px-3 py-2 text-sm" />
          </label>
          {state.error && (
            <div className="mt-3 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm text-red-200">
              {state.error}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button type="submit" className="btn-gold h-10 rounded-full px-6 text-[0.65rem] uppercase tracking-[0.22em]">
              Criar
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="h-10 rounded-full border border-white/10 px-6 text-[0.65rem] uppercase tracking-[0.22em] text-white/60"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">
          Nenhum centro de custo cadastrado.
        </div>
      ) : (
        <ul className="space-y-1">
          {items.map((c) => (
            <li key={c.id} className="flex items-start gap-3 rounded-xl border border-gold/10 bg-white/[0.02] px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white">
                  {c.name}
                  {c.code && <span className="ml-2 text-[0.55rem] text-white/40">#{c.code}</span>}
                </div>
                {c.description && (
                  <div className="mt-0.5 text-[0.65rem] text-white/50">{c.description}</div>
                )}
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(c.id)}
                className="text-red-300/60 hover:text-red-300"
                aria-label="Remover"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
