import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Download } from 'lucide-react';
import { getEvent } from '@/features/calendar/queries';
import { CALENDAR_EVENT_KIND_COLORS, CALENDAR_EVENT_KIND_LABELS } from '@/features/calendar/types';
import { EventActions } from './EventActions';

export const metadata: Metadata = { title: 'Evento · Agenda' };
export const dynamic = 'force-dynamic';

export default async function EventPage({ params }: { params: { eventId: string } }) {
  const ev = await getEvent(params.eventId);
  if (!ev) notFound();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/agenda"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>

      <header className="flex flex-col gap-2">
        <span
          className="self-start rounded-full border px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.22em] text-white"
          style={{
            backgroundColor: CALENDAR_EVENT_KIND_COLORS[ev.kind] + '33',
            borderColor: CALENDAR_EVENT_KIND_COLORS[ev.kind]
          }}
        >
          {CALENDAR_EVENT_KIND_LABELS[ev.kind]}
        </span>
        <h1 className="font-display text-3xl text-white md:text-4xl">{ev.title}</h1>
        <div className="text-sm text-white/70">
          <Calendar className="mr-1 inline h-3.5 w-3.5" strokeWidth={1.5} />
          {new Date(ev.start_at).toLocaleString('pt-BR')}
          {' → '}
          {new Date(ev.end_at).toLocaleString('pt-BR')}
        </div>
        {ev.location && (
          <div className="text-sm text-white/70">
            <MapPin className="mr-1 inline h-3.5 w-3.5" strokeWidth={1.5} />
            {ev.location}
          </div>
        )}
      </header>

      {ev.description && (
        <section className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
          <h2 className="mb-2 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">Descrição</h2>
          <p className="whitespace-pre-wrap text-sm text-white/80">{ev.description}</p>
        </section>
      )}

      <EventActions eventId={ev.id} cancelled={Boolean(ev.cancelled_at)} />

      <Link
        href={`/api/agenda/${ev.id}/ics`}
        className="inline-flex w-fit items-center gap-2 rounded-full border border-gold/30 px-4 py-2 text-[0.65rem] uppercase tracking-[0.22em] text-gold-100 hover:bg-gold/10"
      >
        <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> Baixar .ics
      </Link>
    </div>
  );
}
