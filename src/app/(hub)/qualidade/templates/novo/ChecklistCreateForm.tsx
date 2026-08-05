'use client';

import { useFormState } from 'react-dom';
import { createChecklistAction, type ActionState } from '@/features/qc/actions';

const initial: ActionState = { ok: false };

export function ChecklistCreateForm() {
  const [state, formAction] = useFormState(createChecklistAction, initial);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-xs text-white/60">
        Nome *
        <input name="name" required className="input-dark h-10 rounded-xl px-3 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-white/60">
        Descrição
        <textarea name="description" rows={4} className="input-dark rounded-xl px-3 py-2 text-sm" />
      </label>
      <div className="flex flex-wrap gap-4 text-xs text-white/70">
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input type="checkbox" name="is_default" className="h-4 w-4 rounded border-white/20 bg-black/40 accent-gold-300" />
          Padrão
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4 rounded border-white/20 bg-black/40 accent-gold-300" />
          Ativo
        </label>
      </div>
      {state.error && (
        <div className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </div>
      )}
      <button type="submit" className="btn-gold h-11 rounded-full px-6 text-[0.7rem] uppercase tracking-[0.22em]">
        Criar template
      </button>
    </form>
  );
}
