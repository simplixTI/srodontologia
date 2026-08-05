'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  addChecklistItemAction,
  removeChecklistItemAction,
  toggleChecklistItemAction
} from '@/features/planning/actions';
import type { PlanningChecklistItem } from '@/features/planning/types';

type Props = {
  versionId: string;
  initialItems: PlanningChecklistItem[];
  canEdit: boolean;
};

export function ChecklistPanel({ versionId, initialItems, canEdit }: Props) {
  const [items, setItems] = useState<PlanningChecklistItem[]>(initialItems);
  const [newLabel, setNewLabel] = useState('');
  const [required, setRequired] = useState(true);
  const [pending, startTransition] = useTransition();

  function toggle(id: string, is_done: boolean) {
    setItems((s) => s.map((x) => (x.id === id ? { ...x, is_done } : x)));
    startTransition(async () => {
      try {
        await toggleChecklistItemAction({ item_id: id, is_done });
      } catch (e) {
        setItems((s) => s.map((x) => (x.id === id ? { ...x, is_done: !is_done } : x)));
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  function add() {
    if (!newLabel.trim()) return;
    startTransition(async () => {
      try {
        await addChecklistItemAction({
          planning_version_id: versionId,
          label: newLabel.trim(),
          is_required: required
        });
        setNewLabel('');
        toast.success('Item adicionado');
        // simple approach: reload the section
        location.reload();
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  function remove(id: string) {
    if (!confirm('Remover este item?')) return;
    startTransition(async () => {
      try {
        await removeChecklistItemAction(id);
        setItems((s) => s.filter((x) => x.id !== id));
        toast.success('Removido');
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  return (
    <section className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
      <h2 className="mb-3 flex items-center justify-between text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">
        Checklist
        <span className="text-white/40">
          {items.filter((i) => i.is_done).length} / {items.length}
        </span>
      </h2>

      {items.length === 0 ? (
        <div className="mb-4 text-sm text-white/40">Nenhum item cadastrado.</div>
      ) : (
        <ul className="mb-4 space-y-1">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 rounded-xl border border-gold/5 bg-black/20 px-3 py-2">
              <input
                type="checkbox"
                checked={i.is_done}
                onChange={(e) => toggle(i.id, e.target.checked)}
                disabled={!canEdit}
                className="h-4 w-4 rounded border-white/20 bg-black/40 accent-gold-300"
              />
              <div className="min-w-0 flex-1">
                <span className={'text-sm ' + (i.is_done ? 'text-white/40 line-through' : 'text-white')}>
                  {i.label}
                </span>
                {i.is_required && (
                  <span className="ml-2 text-[0.55rem] uppercase tracking-[0.2em] text-amber-200">obrigatório</span>
                )}
                {i.description && <div className="text-[0.6rem] text-white/40">{i.description}</div>}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => remove(i.id)}
                  className="text-red-300/60 hover:text-red-300"
                  aria-label="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="flex flex-wrap items-end gap-2 border-t border-white/5 pt-4">
          <div className="flex flex-1 flex-col gap-1 text-xs text-white/60">
            Novo item
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="ex: Verificar oclusão"
              className="input-dark h-9 rounded-xl px-3 text-sm"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/40 accent-gold-300"
            />
            Obrigatório
          </label>
          <button
            type="button"
            onClick={add}
            disabled={pending || !newLabel.trim()}
            className="btn-gold inline-flex h-9 items-center gap-2 rounded-full px-4 text-[0.65rem] uppercase tracking-[0.22em]"
          >
            <Plus className="h-3 w-3" strokeWidth={2} /> Adicionar
          </button>
        </div>
      )}
    </section>
  );
}
