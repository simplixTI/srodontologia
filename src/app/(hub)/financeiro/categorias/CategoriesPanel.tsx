'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useFormState } from 'react-dom';
import {
  createCategoryAction,
  deleteCategoryAction,
  type ActionState
} from '@/features/finance-v2/actions';
import type { FinCategory } from '@/features/finance-v2/types';

const initial: ActionState = { ok: false };

type Props = { initialCategories: FinCategory[] };

export function CategoriesPanel({ initialCategories }: Props) {
  const [cats, setCats] = useState<FinCategory[]>(initialCategories);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, formAction] = useFormState(createCategoryAction, initial);

  const revenue = cats.filter((c) => c.kind === 'revenue');
  const expense = cats.filter((c) => c.kind === 'expense');

  function remove(id: string) {
    if (!confirm('Remover esta categoria?')) return;
    startTransition(async () => {
      try {
        await deleteCategoryAction(id);
        setCats((s) => s.filter((x) => x.id !== id));
        toast.success('Removida');
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.28em] text-white/60">
          {cats.length} categoria{cats.length === 1 ? '' : 's'}
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="btn-gold inline-flex h-9 items-center gap-2 rounded-full px-4 text-[0.65rem] uppercase tracking-[0.22em]"
        >
          <Plus className="h-3 w-3" strokeWidth={2} /> Nova categoria
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs text-white/60">
              Nome *
              <input name="name" required className="input-dark h-9 rounded-xl px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/60">
              Tipo *
              <select name="kind" required className="input-dark h-9 rounded-xl px-3 text-sm">
                <option value="expense">Despesa</option>
                <option value="revenue">Receita</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/60">
              Código
              <input name="code" className="input-dark h-9 rounded-xl px-3 text-sm" />
            </label>
          </div>
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <CategoryColumn
          title="Receitas"
          items={revenue}
          onRemove={remove}
          pending={pending}
          tone="emerald"
        />
        <CategoryColumn
          title="Despesas"
          items={expense}
          onRemove={remove}
          pending={pending}
          tone="red"
        />
      </div>
    </div>
  );
}

function CategoryColumn({
  title,
  items,
  onRemove,
  pending,
  tone
}: {
  title: string;
  items: FinCategory[];
  onRemove: (id: string) => void;
  pending: boolean;
  tone: 'emerald' | 'red';
}) {
  const color = tone === 'emerald' ? 'text-emerald-200' : 'text-red-200';
  return (
    <section className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
      <h2 className={`mb-3 text-[0.6rem] uppercase tracking-[0.32em] ${color}`}>
        {title} ({items.length})
      </h2>
      {items.length === 0 ? (
        <div className="text-sm text-white/40">Nenhuma categoria.</div>
      ) : (
        <ul className="space-y-1">
          {items.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-xl border border-gold/5 bg-black/20 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white">
                  {c.name}
                  {c.code && <span className="ml-2 text-[0.55rem] text-white/40">#{c.code}</span>}
                </div>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => onRemove(c.id)}
                className="text-red-300/60 hover:text-red-300"
                aria-label="Remover"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
