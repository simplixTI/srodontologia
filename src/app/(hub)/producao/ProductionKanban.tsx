'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock, User, MoreHorizontal, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import type { ProductionCardWithCase, ProductionStage } from '@/features/production/types';
import {
  CARD_PRIORITIES,
  CARD_PRIORITY_COLORS,
  CARD_PRIORITY_LABELS,
  type CardPriority
} from '@/lib/validations/production';
import { advanceCardAction, updatePriorityAction } from '@/features/production/actions';

type Props = {
  initialCards: ProductionCardWithCase[];
  stages: ProductionStage[];
};

type FilterState = {
  priority: CardPriority | 'all';
  assignee: 'all' | 'unassigned' | 'me';
  overdue: boolean;
  currentUserId?: string | null;
};

const PRIORITY_ORDER: Record<CardPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3
};

export function ProductionKanban({ initialCards, stages }: Props) {
  const [cards, setCards] = useState<ProductionCardWithCase[]>(initialCards);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>({ priority: 'all', assignee: 'all', overdue: false });
  const [, startTransition] = useTransition();

  const activeStages = useMemo(() => stages.filter((s) => s.is_active), [stages]);

  const filteredCards = useMemo(() => {
    let out = cards;
    if (filter.priority !== 'all') out = out.filter((c) => c.priority === filter.priority);
    if (filter.assignee === 'unassigned') out = out.filter((c) => !c.assignee_id);
    if (filter.overdue) {
      const now = Date.now();
      out = out.filter((c) => c.sla_due_at && new Date(c.sla_due_at).getTime() < now && !c.completed_at);
    }
    return out.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }, [cards, filter]);

  const byStage = useMemo(() => {
    const m = new Map<string, ProductionCardWithCase[]>();
    for (const s of activeStages) m.set(s.id, []);
    for (const c of filteredCards) {
      const arr = m.get(c.current_stage_id);
      if (arr) arr.push(c);
    }
    return m;
  }, [activeStages, filteredCards]);

  function handleDragStart(id: string) {
    setDraggingId(id);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setOverStage(null);
  }

  async function handleDrop(toStageId: string) {
    if (!draggingId) return;
    const card = cards.find((c) => c.id === draggingId);
    if (!card || card.current_stage_id === toStageId) {
      handleDragEnd();
      return;
    }
    const toStage = activeStages.find((s) => s.id === toStageId);
    if (!toStage) {
      handleDragEnd();
      return;
    }
    const isRework = toStage.is_rework;
    const prevStageId = card.current_stage_id;

    // Optimistic move
    setCards((prev) =>
      prev.map((c) =>
        c.id === draggingId
          ? {
              ...c,
              current_stage_id: toStageId,
              entered_stage_at: new Date().toISOString(),
              completed_at: toStage.is_terminal ? new Date().toISOString() : null
            }
          : c
      )
    );

    startTransition(async () => {
      try {
        await advanceCardAction({
          card_id: draggingId,
          to_stage_id: toStageId,
          is_rework: isRework
        });
        toast.success(isRework ? 'Cartão movido para retrabalho' : 'Etapa atualizada');
      } catch (e) {
        setCards((prev) =>
          prev.map((c) =>
            c.id === draggingId
              ? { ...c, current_stage_id: prevStageId, entered_stage_at: card.entered_stage_at, completed_at: card.completed_at }
              : c
          )
        );
        toast.error('Falha ao mover', { description: (e as Error).message });
      }
    });

    handleDragEnd();
  }

  async function handlePriorityChange(cardId: string, priority: CardPriority) {
    const prev = cards.find((c) => c.id === cardId)?.priority ?? 'normal';
    setCards((cs) => cs.map((c) => (c.id === cardId ? { ...c, priority } : c)));
    try {
      await updatePriorityAction({ card_id: cardId, priority });
      toast.success('Prioridade atualizada');
    } catch (e) {
      setCards((cs) => cs.map((c) => (c.id === cardId ? { ...c, priority: prev } : c)));
      toast.error('Falha', { description: (e as Error).message });
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          value={filter.priority}
          onChange={(e) => setFilter((f) => ({ ...f, priority: e.target.value as CardPriority | 'all' }))}
          className="input-dark h-9 rounded-full px-4 text-xs"
        >
          <option value="all">Todas prioridades</option>
          {CARD_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {CARD_PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
        <select
          value={filter.assignee}
          onChange={(e) => setFilter((f) => ({ ...f, assignee: e.target.value as FilterState['assignee'] }))}
          className="input-dark h-9 rounded-full px-4 text-xs"
        >
          <option value="all">Todos técnicos</option>
          <option value="unassigned">Sem responsável</option>
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-white/60">
          <input
            type="checkbox"
            checked={filter.overdue}
            onChange={(e) => setFilter((f) => ({ ...f, overdue: e.target.checked }))}
            className="h-4 w-4 rounded border-white/20 bg-black/40 accent-gold-300"
          />
          Apenas atrasados
        </label>
        <div className="ml-auto text-xs text-white/40">
          {filteredCards.length} de {cards.length} cartões
        </div>
      </div>

      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5"
        style={{ gridTemplateColumns: `repeat(${Math.min(activeStages.length, 5)}, minmax(0, 1fr))` }}
      >
        {activeStages.map((stage) => {
          const items = byStage.get(stage.id) ?? [];
          const isOver = overStage === stage.id;
          return (
            <div
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (overStage !== stage.id) setOverStage(stage.id);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget === e.target) setOverStage(null);
              }}
              onDrop={() => handleDrop(stage.id)}
              className={
                'rounded-2xl border p-4 transition-colors ' +
                (isOver ? 'border-gold/50 bg-gold/[0.05]' : 'border-gold/10 bg-white/[0.02]')
              }
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: stage.color }}
                    aria-hidden
                  />
                  <span className="text-[0.65rem] uppercase tracking-[0.28em] text-white/70">
                    {stage.name}
                  </span>
                </div>
                <span className="font-mono text-[0.55rem] text-white/40">
                  {items.length.toString().padStart(2, '0')}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {items.length === 0 && (
                  <div
                    className={
                      'rounded-xl border border-dashed p-3 text-center text-[0.6rem] uppercase tracking-[0.28em] transition ' +
                      (isOver ? 'border-gold/40 text-gold-100' : 'border-white/10 text-white/25')
                    }
                  >
                    {isOver ? 'soltar aqui' : 'vazio'}
                  </div>
                )}
                {items.map((c) => (
                  <ProductionCardTile
                    key={c.id}
                    card={c}
                    isDragging={draggingId === c.id}
                    onDragStart={() => handleDragStart(c.id)}
                    onDragEnd={handleDragEnd}
                    onPriorityChange={(p) => handlePriorityChange(c.id, p)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ProductionCardTile({
  card,
  isDragging,
  onDragStart,
  onDragEnd,
  onPriorityChange
}: {
  card: ProductionCardWithCase;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onPriorityChange: (p: CardPriority) => void;
}) {
  const overdue =
    card.sla_due_at && new Date(card.sla_due_at).getTime() < Date.now() && !card.completed_at;
  const enteredAt = new Date(card.entered_stage_at);
  const hoursInStage = Math.max(0, (Date.now() - enteredAt.getTime()) / 3600_000);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={
        'group cursor-grab rounded-xl border border-gold/10 bg-black/40 p-3 transition ' +
        (isDragging ? 'opacity-40' : 'hover:border-gold/30 active:cursor-grabbing')
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/producao/${card.id}`}
            className="block truncate text-sm text-white hover:text-gold-100"
          >
            {card.case_code ?? 'Caso'} — {card.case_title ?? 'Sem título'}
          </Link>
          {card.patient_name && (
            <div className="mt-0.5 truncate text-[0.65rem] text-white/50">
              Paciente: {card.patient_name}
            </div>
          )}
          {card.dentist_name && (
            <div className="truncate text-[0.6rem] text-white/40">Dr(a). {card.dentist_name}</div>
          )}
        </div>
        <Link
          href={`/producao/${card.id}`}
          className="shrink-0 text-white/30 opacity-0 transition group-hover:opacity-100 hover:text-gold-100"
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <PriorityDropdown value={card.priority} onChange={onPriorityChange} />
        {card.assignee_name && (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[0.55rem] text-white/60">
            <User className="h-2.5 w-2.5" strokeWidth={1.5} />
            {card.assignee_name}
          </span>
        )}
        {overdue && (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-red-400/40 bg-red-400/10 px-2 py-0.5 text-[0.55rem] text-red-200"
            title={`SLA: ${card.sla_due_at}`}
          >
            <AlertTriangle className="h-2.5 w-2.5" strokeWidth={1.5} />
            Atrasado
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[0.55rem] text-white/40">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" strokeWidth={1.5} />
          {hoursInStage < 1
            ? `${Math.round(hoursInStage * 60)} min`
            : `${hoursInStage.toFixed(1)} h`}
        </span>
        {card.rework_count > 0 && (
          <span className="rounded-md bg-red-400/10 px-1.5 py-0.5 text-[0.55rem] text-red-200">
            RTB × {card.rework_count}
          </span>
        )}
      </div>
    </div>
  );
}

function PriorityDropdown({
  value,
  onChange
}: {
  value: CardPriority;
  onChange: (p: CardPriority) => void;
}) {
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CardPriority)}
        onClick={(e) => e.stopPropagation()}
        onDragStart={(e) => e.stopPropagation()}
        draggable={false}
        className="cursor-pointer appearance-none rounded-full border border-white/10 bg-transparent py-0.5 pl-3 pr-6 text-[0.55rem] uppercase tracking-[0.15em]"
        style={{ color: CARD_PRIORITY_COLORS[value], borderColor: `${CARD_PRIORITY_COLORS[value]}55` }}
      >
        {CARD_PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {CARD_PRIORITY_LABELS[p]}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40"
        strokeWidth={1.5}
      />
    </div>
  );
}
