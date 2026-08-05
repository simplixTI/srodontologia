'use client';

import { useState, useTransition } from 'react';
import { Plus, MapPin, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useFormState } from 'react-dom';
import {
  createRouteAction,
  deleteRouteAction,
  type ActionState
} from '@/features/deliveries-v2/actions';
import type { Driver, Route } from '@/features/deliveries-v2/types';

type Props = { initialRoutes: Route[]; drivers: Driver[] };

const initial: ActionState = { ok: false };

export function RoutesPanel({ initialRoutes, drivers }: Props) {
  const [routes, setRoutes] = useState<Route[]>(initialRoutes);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, formAction] = useFormState(createRouteAction, initial);

  function remove(id: string) {
    if (!confirm('Remover esta rota?')) return;
    startTransition(async () => {
      try {
        await deleteRouteAction(id);
        setRoutes((s) => s.filter((r) => r.id !== id));
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
          {routes.length} rota{routes.length === 1 ? '' : 's'}
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="btn-gold inline-flex h-9 items-center gap-2 rounded-full px-4 text-[0.65rem] uppercase tracking-[0.22em]"
        >
          <Plus className="h-3 w-3" strokeWidth={2} /> Nova rota
        </button>
      </div>

      {creating && (
        <form
          action={(fd) => {
            formAction(fd);
            setTimeout(() => {
              if (state.ok !== false) location.reload();
            }, 200);
          }}
          className="rounded-2xl border border-gold/20 bg-white/[0.03] p-5"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-white/60">
              Nome *
              <input name="name" required className="input-dark h-9 rounded-xl px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/60">
              Região
              <input name="region" className="input-dark h-9 rounded-xl px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/60">
              Motorista responsável
              <select name="driver_id" className="input-dark h-9 rounded-xl px-3 text-sm">
                <option value="">Sem motorista</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex cursor-pointer items-center gap-2 self-end text-xs text-white/70">
              <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4 rounded border-white/20 bg-black/40 accent-gold-300" />
              Ativa
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1 text-xs text-white/60">
            Descrição
            <textarea name="description" rows={3} className="input-dark rounded-xl px-3 py-2 text-sm" />
          </label>
          {state.error && (
            <div className="mt-3 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">
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

      {routes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">
          Sem rotas cadastradas.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {routes.map((r) => {
            const driver = drivers.find((d) => d.id === r.driver_id);
            return (
              <li key={r.id} className="flex items-start gap-3 rounded-2xl border border-gold/10 bg-white/[0.02] p-4">
                <MapPin className="h-4 w-4 text-gold-300" strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white">{r.name}</div>
                  {r.region && <div className="text-[0.6rem] text-white/50">Região: {r.region}</div>}
                  {driver && <div className="text-[0.6rem] text-white/50">Motorista: {driver.full_name}</div>}
                  {r.description && <div className="mt-1 line-clamp-2 text-xs text-white/60">{r.description}</div>}
                </div>
                <span
                  className={
                    'shrink-0 rounded-full border px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.2em] ' +
                    (r.is_active ? 'border-emerald-400/40 text-emerald-200' : 'border-white/20 text-white/40')
                  }
                >
                  {r.is_active ? 'Ativa' : 'Inativa'}
                </span>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  disabled={pending}
                  className="text-red-300/60 hover:text-red-300"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
