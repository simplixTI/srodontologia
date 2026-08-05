'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { advanceCardAction, updatePriorityAction } from '@/features/production/actions';
import type { ProductionCardWithCase, ProductionStage } from '@/features/production/types';
import {
  CARD_PRIORITIES,
  CARD_PRIORITY_LABELS,
  type CardPriority
} from '@/lib/validations/production';

type Props = {
  card: ProductionCardWithCase;
  stages: ProductionStage[];
};

export function CardActions({ card, stages }: Props) {
  const [targetStageId, setTargetStageId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<CardPriority>(card.priority);
  const [pending, startTransition] = useTransition();

  const other = stages.filter((s) => s.id !== card.current_stage_id);

  function submitAdvance(isRework: boolean) {
    if (!targetStageId) {
      toast.error('Selecione uma etapa de destino');
      return;
    }
    startTransition(async () => {
      try {
        await advanceCardAction({
          card_id: card.id,
          to_stage_id: targetStageId,
          reason: reason || null,
          notes: notes || null,
          is_rework: isRework
        });
        toast.success(isRework ? 'Retrabalho registrado' : 'Etapa avançada');
        setReason('');
        setNotes('');
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  function submitPriority() {
    startTransition(async () => {
      try {
        await updatePriorityAction({ card_id: card.id, priority });
        toast.success('Prioridade atualizada');
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
        <h2 className="mb-3 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">Avançar etapa</h2>
        <div className="flex flex-col gap-2">
          <select
            value={targetStageId}
            onChange={(e) => setTargetStageId(e.target.value)}
            className="input-dark h-10 rounded-xl px-3 text-sm"
          >
            <option value="">Selecione a etapa</option>
            {other.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (opcional)"
            className="input-dark h-10 rounded-xl px-3 text-sm"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações (opcional)"
            rows={3}
            className="input-dark rounded-xl px-3 py-2 text-sm"
          />
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => submitAdvance(false)}
              className="btn-gold h-10 flex-1 rounded-full text-[0.7rem] uppercase tracking-[0.22em]"
            >
              Avançar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => submitAdvance(true)}
              className="btn-outline-gold h-10 rounded-full px-4 text-[0.7rem] uppercase tracking-[0.22em]"
              title="Marcar como retrabalho"
            >
              Retrabalho
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
        <h2 className="mb-3 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">Prioridade</h2>
        <div className="flex flex-col gap-2">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as CardPriority)}
            className="input-dark h-10 rounded-xl px-3 text-sm"
          >
            {CARD_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {CARD_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending || priority === card.priority}
            onClick={submitPriority}
            className="btn-gold h-10 rounded-full text-[0.7rem] uppercase tracking-[0.22em]"
          >
            Atualizar
          </button>
        </div>

        <div className="mt-6 text-xs text-white/50">
          SLA atual:{' '}
          <strong className="text-white/80">
            {card.sla_due_at
              ? new Date(card.sla_due_at).toLocaleString('pt-BR')
              : 'sem SLA'}
          </strong>
        </div>
        <div className="mt-1 text-xs text-white/50">
          Cartão criado em{' '}
          {new Date(card.created_at).toLocaleDateString('pt-BR')}.
        </div>
      </div>
    </section>
  );
}
