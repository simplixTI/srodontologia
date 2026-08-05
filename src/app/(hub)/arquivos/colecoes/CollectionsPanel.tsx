'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useFormState } from 'react-dom';
import {
  createCollectionAction,
  deleteCollectionAction,
  type ActionState
} from '@/features/dam/actions';
import type { FileCollection } from '@/features/dam/types';

const initial: ActionState = { ok: false };

export function CollectionsPanel({ initialCollections }: { initialCollections: FileCollection[] }) {
  const [items, setItems] = useState<FileCollection[]>(initialCollections);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, formAction] = useFormState(createCollectionAction, initial);

  function remove(id: string) {
    if (!confirm('Remover esta coleção?')) return;
    startTransition(async () => {
      try {
        await deleteCollectionAction(id);
        setItems((s) => s.filter((x) => x.id !== id));
        toast.success('Removida');
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.28em] text-white/60">
          {items.length} coleção{items.length === 1 ? '' : 'ões'}
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="btn-gold inline-flex h-9 items-center gap-2 rounded-full px-4 text-[0.65rem] uppercase tracking-[0.22em]"
        >
          <Plus className="h-3 w-3" strokeWidth={2} /> Nova coleção
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
              Cor
              <input
                type="color"
                name="color"
                defaultValue="#3B82F6"
                className="h-9 rounded-xl border border-white/10 bg-black/40 px-2"
              />
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1 text-xs text-white/60">
            Descrição
            <textarea name="description" rows={3} className="input-dark rounded-xl px-3 py-2 text-sm" />
          </label>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              name="is_shared"
              defaultChecked
              className="h-4 w-4 rounded border-white/20 bg-black/40 accent-gold-300"
            />
            Visível para toda a organização
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

      {items.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((c) => (
            <li key={c.id} className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-lg text-white">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                    <FolderOpen className="h-4 w-4 text-gold-300" strokeWidth={1.5} />
                    {c.name}
                  </div>
                  {c.description && (
                    <div className="mt-1 line-clamp-2 text-xs text-white/60">{c.description}</div>
                  )}
                  <div className="mt-1 text-[0.55rem] uppercase tracking-[0.2em] text-white/40">
                    {c.is_shared ? 'Compartilhada' : 'Pessoal'}
                  </div>
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
