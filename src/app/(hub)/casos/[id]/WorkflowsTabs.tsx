'use client';

import { useState, useTransition } from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import type { PlanningVersion } from '@/features/planning/types';
import { PLANNING_STATUS_LABELS } from '@/features/planning/types';
import { createPlanningVersionAction } from '@/features/planning/actions';
import { Field, Submit } from '@/components/ui/Field';

// ─── Planning tab ────────────────────────────────────────────
export function PlanningTab({ caseId, versions }: { caseId: string; versions: PlanningVersion[] }) {
  const [openForm, setOpenForm] = useState(versions.length === 0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (fd: FormData) => {
    setError(null);
    startTransition(async () => {
      const res = await createPlanningVersionAction(caseId, fd);
      if (!res.ok) setError(res.error ?? 'Erro ao criar.');
      else {
        toast.success('Versão de planejamento criada');
        window.location.reload();
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl text-white">Planejamento técnico</h3>
          <p className="mt-1 text-xs text-white/50">
            {versions.length} versão{versions.length !== 1 ? 'ões' : ''} · aprovadas ficam bloqueadas
          </p>
        </div>
        {!openForm && (
          <button
            onClick={() => setOpenForm(true)}
            className="btn-gold inline-flex h-10 items-center gap-2 rounded-full px-5 text-[0.65rem] uppercase tracking-[0.24em]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Nova versão
          </button>
        )}
      </div>

      {openForm && (
        <form action={submit} className="rounded-2xl border border-gold/20 bg-white/[0.02] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-display text-lg text-white">Nova versão de planejamento</h4>
            <button type="button" onClick={() => setOpenForm(false)} className="text-[0.6rem] uppercase tracking-[0.28em] text-white/50 hover:text-gold-100">
              cancelar
            </button>
          </div>
          <Field label="Descrição técnica" htmlFor="technical_description">
            <textarea
              id="technical_description"
              name="technical_description"
              rows={5}
              className="w-full rounded-xl border border-gold/15 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25"
              placeholder="Estratégia cirúrgica, sequência de instalação, materiais utilizados..."
            />
          </Field>
          {error && <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
          <div className="mt-4"><Submit pending={pending}>Criar rascunho</Submit></div>
        </form>
      )}

      {versions.length === 0 && !openForm && (
        <p className="rounded-2xl border border-gold/10 bg-white/[0.02] p-8 text-center text-sm text-white/50">
          Nenhum planejamento gerado ainda.
        </p>
      )}

      {versions.map((v) => (
        <div key={v.id} className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/20 bg-black/40">
                <ClipboardList className="h-4 w-4 text-gold-100" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-sm text-white">Versão {v.version_number}</div>
                <div className="text-[0.6rem] uppercase tracking-[0.25em] text-white/40">
                  {new Date(v.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
            <span className={statusPill(v.status)}>{PLANNING_STATUS_LABELS[v.status]}</span>
          </div>
          {v.technical_description && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-white/80">{v.technical_description}</p>
          )}
          <p className="mt-3 text-[0.55rem] uppercase tracking-[0.25em] text-white/30">
            Anexos + aprovação pelo dentista na Fase 4.
          </p>
        </div>
      ))}
    </div>
  );
}

function statusPill(status: string) {
  const base = 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.28em]';
  switch (status) {
    case 'draft': return `${base} border-white/15 bg-white/[0.03] text-white/60`;
    case 'sent': return `${base} border-sky-400/30 bg-sky-400/10 text-sky-200`;
    case 'approved': return `${base} border-emerald-400/30 bg-emerald-400/10 text-emerald-200`;
    case 'changes_requested': return `${base} border-amber-400/30 bg-amber-400/10 text-amber-200`;
    case 'obsolete': return `${base} border-white/10 bg-white/[0.02] text-white/40`;
    default: return `${base} border-white/15 bg-white/[0.03] text-white/60`;
  }
}
