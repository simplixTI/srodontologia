'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import type { ProductionStage } from '@/features/production/types';
import {
  createStageAction,
  deleteStageAction,
  reorderStagesAction,
  updateStageAction
} from '@/features/production/actions';

type Props = { initialStages: ProductionStage[] };

export function StageManager({ initialStages }: Props) {
  const [stages, setStages] = useState<ProductionStage[]>(initialStages);
  const [creating, setCreating] = useState(false);
  const [, startTransition] = useTransition();

  async function handleCreate(formData: FormData) {
    const res = await createStageAction(undefined, formData);
    if (!res.ok) {
      toast.error(res.error ?? 'Falha ao criar etapa');
      return;
    }
    toast.success('Etapa criada');
    setCreating(false);
    // Reload from server
    location.reload();
  }

  async function handleToggleActive(stage: ProductionStage) {
    const next = !stage.is_active;
    setStages((s) => s.map((x) => (x.id === stage.id ? { ...x, is_active: next } : x)));
    try {
      await updateStageAction(stage.id, { is_active: next });
      toast.success('Etapa atualizada');
    } catch (e) {
      setStages((s) => s.map((x) => (x.id === stage.id ? { ...x, is_active: !next } : x)));
      toast.error('Falha', { description: (e as Error).message });
    }
  }

  async function handleDelete(stage: ProductionStage) {
    if (!confirm(`Excluir a etapa "${stage.name}"?`)) return;
    try {
      await deleteStageAction(stage.id);
      setStages((s) => s.filter((x) => x.id !== stage.id));
      toast.success('Etapa excluída');
    } catch (e) {
      toast.error('Falha ao excluir', { description: (e as Error).message });
    }
  }

  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= stages.length) return;
    const next = [...stages];
    [next[idx], next[j]] = [next[j], next[idx]];
    setStages(next);
    startTransition(async () => {
      try {
        await reorderStagesAction(next.map((s) => s.id));
      } catch (e) {
        toast.error('Falha ao reordenar', { description: (e as Error).message });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.28em] text-white/60">
          {stages.length} etapa{stages.length === 1 ? '' : 's'}
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="btn-gold inline-flex h-9 items-center gap-2 rounded-full px-4 text-[0.68rem] uppercase tracking-[0.22em]"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Nova etapa
        </button>
      </div>

      {creating && (
        <form
          action={handleCreate}
          className="rounded-2xl border border-gold/20 bg-white/[0.03] p-5"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Nome" name="name" required />
            <Field label="Slug" name="slug" required placeholder="ex: modelagem" />
            <Field label="Cor (hex)" name="color" defaultValue="#6B7280" />
            <Field label="SLA (horas)" name="sla_hours" type="number" min={0} />
            <Field label="Posição" name="position" type="number" defaultValue="10" />
            <Field label="Descrição" name="description" />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/70">
            <Check label="Etapa terminal (finaliza)" name="is_terminal" />
            <Check label="Etapa de retrabalho" name="is_rework" />
            <Check label="Etapa inicial" name="is_initial" />
            <Check label="Ativa" name="is_active" defaultChecked />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="btn-gold h-10 rounded-full px-6 text-[0.68rem] uppercase tracking-[0.22em]"
            >
              Criar
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="h-10 rounded-full border border-white/10 px-6 text-[0.68rem] uppercase tracking-[0.22em] text-white/70"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <ul className="flex flex-col gap-2">
        {stages.map((s, idx) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-gold/10 bg-white/[0.02] p-4"
          >
            <span className="font-mono text-[0.55rem] text-white/40">{String(idx + 1).padStart(2, '0')}</span>
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-white">{s.name}</div>
              <div className="truncate text-[0.6rem] text-white/40">
                slug: {s.slug} · pos: {s.position}
                {s.sla_hours != null && ` · SLA ${s.sla_hours}h`}
                {s.is_terminal && ' · terminal'}
                {s.is_rework && ' · retrabalho'}
                {s.is_initial && ' · inicial'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleActive(s)}
              className={
                'h-8 rounded-full border px-3 text-[0.6rem] uppercase tracking-[0.2em] transition ' +
                (s.is_active
                  ? 'border-emerald-400/40 text-emerald-200'
                  : 'border-white/20 text-white/40')
              }
            >
              {s.is_active ? 'Ativa' : 'Inativa'}
            </button>
            <button
              type="button"
              onClick={() => move(idx, -1)}
              className="rounded-md p-1 text-white/40 hover:text-white"
              title="Mover acima"
              aria-label="Mover acima"
            >
              <ArrowUp className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => move(idx, 1)}
              className="rounded-md p-1 text-white/40 hover:text-white"
              title="Mover abaixo"
              aria-label="Mover abaixo"
            >
              <ArrowDown className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(s)}
              className="rounded-md p-1 text-red-300/70 hover:text-red-300"
              title="Excluir"
              aria-label="Excluir"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required = false,
  defaultValue,
  placeholder,
  min
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  min?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-white/60">
      {label}
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        min={min}
        className="input-dark h-9 rounded-xl px-3 text-sm text-white"
      />
    </label>
  );
}

function Check({
  label,
  name,
  defaultChecked
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-white/20 bg-black/40 accent-gold-300"
      />
      {label}
    </label>
  );
}
