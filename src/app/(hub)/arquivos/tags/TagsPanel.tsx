'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useFormState } from 'react-dom';
import { createTagAction, deleteTagAction, type ActionState } from '@/features/dam/actions';
import type { FileTag } from '@/features/dam/types';

const initial: ActionState = { ok: false };

export function TagsPanel({ initialTags }: { initialTags: FileTag[] }) {
  const [tags, setTags] = useState<FileTag[]>(initialTags);
  const [pending, startTransition] = useTransition();
  const [state, formAction] = useFormState(createTagAction, initial);

  function remove(id: string) {
    if (!confirm('Remover esta tag?')) return;
    startTransition(async () => {
      try {
        await deleteTagAction(id);
        setTags((s) => s.filter((t) => t.id !== id));
        toast.success('Removida');
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
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
              defaultValue="#6B7280"
              className="h-9 rounded-xl border border-white/10 bg-black/40 px-2"
            />
          </label>
        </div>
        {state.error && (
          <div className="mt-3 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm text-red-200">
            {state.error}
          </div>
        )}
        <button
          type="submit"
          className="btn-gold mt-3 inline-flex h-9 items-center gap-2 rounded-full px-4 text-[0.65rem] uppercase tracking-[0.22em]"
        >
          <Plus className="h-3 w-3" strokeWidth={2} /> Adicionar tag
        </button>
      </form>

      {tags.length === 0 ? (
        <div className="text-sm text-white/40">Nenhuma tag cadastrada.</div>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <li
              key={t.id}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-white"
              style={{ backgroundColor: t.color + '33', borderColor: t.color }}
            >
              {t.name}
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(t.id)}
                className="text-white/60 hover:text-red-300"
                aria-label="Remover"
              >
                <Trash2 className="h-3 w-3" strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
