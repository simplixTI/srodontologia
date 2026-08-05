import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, RefreshCw } from 'lucide-react';
import { getCard, listCardEvents, listActiveStages } from '@/features/production/queries';
import { CardActions } from './CardActions';

export const metadata: Metadata = { title: 'Cartão · Produção' };
export const dynamic = 'force-dynamic';

export default async function CardDetailPage({ params }: { params: { cardId: string } }) {
  const [card, events, stages] = await Promise.all([
    getCard(params.cardId),
    listCardEvents(params.cardId),
    listActiveStages()
  ]);
  if (!card) notFound();

  const currentStage = stages.find((s) => s.id === card.current_stage_id);
  const totalHours = card.total_time_ms / 3600_000;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/producao"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar ao Kanban
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Cartão · Produção
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>
        <h1 className="font-display text-3xl text-white md:text-4xl">
          {card.case_code ?? 'Caso'} — {card.case_title ?? 'Sem título'}
        </h1>
        <div className="text-sm text-white/60">
          {card.patient_name && <>Paciente: {card.patient_name} · </>}
          {card.dentist_name && <>Dr(a). {card.dentist_name}</>}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatTile
          label="Etapa atual"
          value={currentStage?.name ?? '—'}
          color={currentStage?.color}
        />
        <StatTile label="Prioridade" value={card.priority} />
        <StatTile
          label="Retrabalho"
          value={String(card.rework_count)}
          icon={<RefreshCw className="h-3 w-3" strokeWidth={1.5} />}
        />
        <StatTile
          label="Tempo total"
          value={`${totalHours.toFixed(1)} h`}
          icon={<Clock className="h-3 w-3" strokeWidth={1.5} />}
        />
      </div>

      <CardActions card={card} stages={stages} />

      <section>
        <h2 className="mb-3 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">Histórico</h2>
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">
            Sem transições ainda.
          </div>
        ) : (
          <ol className="space-y-2">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="flex flex-col gap-1 rounded-xl border border-gold/10 bg-white/[0.02] p-4"
              >
                <div className="flex items-center justify-between text-xs text-white/70">
                  <span>
                    {ev.from_stage_name ?? '—'} → <strong className="text-white">{ev.to_stage_name ?? '—'}</strong>
                    {ev.is_rework && (
                      <span className="ml-2 rounded-md bg-red-400/10 px-1.5 py-0.5 text-[0.55rem] text-red-200">
                        RETRABALHO
                      </span>
                    )}
                  </span>
                  <span className="text-[0.6rem] text-white/40">
                    {new Date(ev.occurred_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[0.65rem] text-white/50">
                  {ev.actor_name && <span>por {ev.actor_name}</span>}
                  <span>
                    {ev.duration_ms > 0
                      ? `${(ev.duration_ms / 3600_000).toFixed(2)} h na etapa anterior`
                      : 'sem tempo registrado'}
                  </span>
                </div>
                {ev.reason && <div className="text-xs text-white/70">Motivo: {ev.reason}</div>}
                {ev.notes && <div className="text-xs text-white/60">{ev.notes}</div>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  color,
  icon
}: {
  label: string;
  value: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-[0.55rem] uppercase tracking-[0.28em] text-white/50">
        {icon}
        {label}
      </div>
      <div
        className="mt-2 truncate font-display text-xl text-white"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
