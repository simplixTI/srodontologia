'use client';

import { useFormState } from 'react-dom';
import { createEventAction, type ActionState } from '@/features/calendar/actions';
import { CALENDAR_EVENT_KIND_LABELS } from '@/features/calendar/types';

const initial: ActionState = { ok: false };

export function EventCreateForm() {
  const [state, formAction] = useFormState(createEventAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-xs text-white/60">
        Título *
        <input name="title" required className="input-dark h-10 rounded-xl px-3 text-sm" />
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Tipo *
          <select name="kind" defaultValue="other" className="input-dark h-10 rounded-xl px-3 text-sm">
            {Object.entries(CALENDAR_EVENT_KIND_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Cor
          <input
            type="color"
            name="color"
            defaultValue="#3B82F6"
            className="h-10 rounded-xl border border-white/10 bg-black/40 px-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Início *
          <input
            type="datetime-local"
            name="start_at"
            required
            className="input-dark h-10 rounded-xl px-3 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Fim *
          <input
            type="datetime-local"
            name="end_at"
            required
            className="input-dark h-10 rounded-xl px-3 text-sm"
          />
        </label>
      </div>

      <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-white/70">
        <input type="checkbox" name="all_day" className="h-4 w-4 rounded border-white/20 bg-black/40 accent-gold-300" />
        Dia inteiro
      </label>

      <label className="flex flex-col gap-1 text-xs text-white/60">
        Local
        <input name="location" className="input-dark h-10 rounded-xl px-3 text-sm" />
      </label>

      <label className="flex flex-col gap-1 text-xs text-white/60">
        Descrição
        <textarea name="description" rows={4} className="input-dark rounded-xl px-3 py-2 text-sm" />
      </label>

      {state.error && (
        <div className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </div>
      )}

      <button type="submit" className="btn-gold h-11 rounded-full px-6 text-[0.7rem] uppercase tracking-[0.22em]">
        Criar evento
      </button>
    </form>
  );
}
