'use client';

import { useFormState } from 'react-dom';
import { createPayableAction, type ActionState } from '@/features/finance-v2/actions';
import type { CostCenter, FinCategory } from '@/features/finance-v2/types';

const initial: ActionState = { ok: false };

type Props = { categories: FinCategory[]; costCenters: CostCenter[] };

export function PayableCreateForm({ categories, costCenters }: Props) {
  const [state, formAction] = useFormState(createPayableAction, initial);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-xs text-white/60">
        Fornecedor *
        <input name="supplier_name" required className="input-dark h-10 rounded-xl px-3 text-sm" />
      </label>

      <label className="flex flex-col gap-1 text-xs text-white/60">
        Descrição
        <textarea name="description" rows={3} className="input-dark rounded-xl px-3 py-2 text-sm" />
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Valor (R$) *
          <input
            type="number"
            name="amount"
            step="0.01"
            min="0"
            required
            className="input-dark h-10 rounded-xl px-3 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Vencimento *
          <input type="date" name="due_date" required className="input-dark h-10 rounded-xl px-3 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Categoria
          <select name="category_id" className="input-dark h-10 rounded-xl px-3 text-sm">
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Centro de custo
          <select name="cost_center_id" className="input-dark h-10 rounded-xl px-3 text-sm">
            <option value="">Sem centro de custo</option>
            {costCenters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs text-white/60">
        Referência externa
        <input name="external_reference" className="input-dark h-10 rounded-xl px-3 text-sm" />
      </label>

      <label className="flex flex-col gap-1 text-xs text-white/60">
        Anotações
        <textarea name="notes" rows={3} className="input-dark rounded-xl px-3 py-2 text-sm" />
      </label>

      {state.error && (
        <div className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </div>
      )}

      <button type="submit" className="btn-gold h-11 rounded-full px-6 text-[0.7rem] uppercase tracking-[0.22em]">
        Criar conta
      </button>
    </form>
  );
}
