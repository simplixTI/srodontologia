import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Calendar as CalIcon } from 'lucide-react';
import { listEvents } from '@/features/calendar/queries';
import {
  CALENDAR_EVENT_KIND_COLORS,
  CALENDAR_EVENT_KIND_LABELS,
  type CalendarEventKind
} from '@/features/calendar/types';

export const metadata: Metadata = { title: 'Agenda · SR HUB' };
export const dynamic = 'force-dynamic';

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}

export default async function AgendaPage({
  searchParams
}: {
  searchParams?: { m?: string };
}) {
  const now = new Date();
  const target = searchParams?.m ? new Date(searchParams.m + '-01') : now;
  const from = startOfMonth(target);
  const to = endOfMonth(target);

  const events = await listEvents({ from: from.toISOString(), to: to.toISOString() });

  const byDay = new Map<string, typeof events>();
  for (const e of events) {
    const day = new Date(e.start_at).toISOString().slice(0, 10);
    const arr = byDay.get(day) ?? [];
    arr.push(e);
    byDay.set(day, arr);
  }

  const firstDayOfMonth = from.getDay();
  const totalDays = endOfMonth(target).getDate();

  const cells: Array<{ date?: Date; day?: string; events: typeof events }> = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push({ events: [] });
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(target.getFullYear(), target.getMonth(), d);
    const iso = date.toISOString().slice(0, 10);
    cells.push({ date, day: iso, events: byDay.get(iso) ?? [] });
  }

  const prevMonth = new Date(target.getFullYear(), target.getMonth() - 1, 1);
  const nextMonth = new Date(target.getFullYear(), target.getMonth() + 1, 1);
  const monthLabel = target.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const prevQuery = prevMonth.toISOString().slice(0, 7);
  const nextQuery = nextMonth.toISOString().slice(0, 7);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Estúdio · Agenda</div>
          <h1 className="mt-2 font-display text-4xl leading-tight text-white md:text-5xl">
            {monthLabel}
          </h1>
          <p className="mt-2 text-sm text-white/60">
            {events.length} evento{events.length === 1 ? '' : 's'} no mês.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/agenda?m=${prevQuery}`}
            className="h-10 rounded-full border border-white/10 px-4 text-[0.65rem] uppercase tracking-[0.22em] text-white/70 hover:border-white/30"
          >
            ← Mês anterior
          </Link>
          <Link
            href="/agenda"
            className="h-10 rounded-full border border-white/10 px-4 text-[0.65rem] uppercase tracking-[0.22em] text-white/70 hover:border-white/30"
          >
            Hoje
          </Link>
          <Link
            href={`/agenda?m=${nextQuery}`}
            className="h-10 rounded-full border border-white/10 px-4 text-[0.65rem] uppercase tracking-[0.22em] text-white/70 hover:border-white/30"
          >
            Próximo mês →
          </Link>
          <Link
            href="/agenda/novo"
            className="btn-gold inline-flex h-10 items-center gap-2 rounded-full px-4 text-[0.65rem] uppercase tracking-[0.22em]"
          >
            <Plus className="h-3 w-3" strokeWidth={2} /> Novo evento
          </Link>
        </div>
      </header>

      {events.length === 0 && (
        <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">
          <CalIcon className="mx-auto mb-3 h-6 w-6 text-gold-300" strokeWidth={1.5} />
          Sem eventos neste mês.
        </div>
      )}

      <section className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-[0.55rem] uppercase tracking-[0.22em] text-white/40">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {cells.map((c, i) => (
            <div
              key={i}
              className={
                'min-h-[100px] rounded-lg border p-2 text-left ' +
                (c.date
                  ? 'border-gold/10 bg-black/20'
                  : 'border-transparent bg-transparent')
              }
            >
              {c.date && (
                <>
                  <div className="text-[0.6rem] text-white/40">{c.date.getDate()}</div>
                  <ul className="mt-1 space-y-0.5">
                    {c.events.slice(0, 3).map((e) => (
                      <li key={e.id}>
                        <Link
                          href={`/agenda/${e.id}`}
                          className="block truncate rounded px-1 py-0.5 text-[0.55rem] text-white hover:opacity-80"
                          style={{
                            backgroundColor:
                              CALENDAR_EVENT_KIND_COLORS[e.kind as CalendarEventKind] + '33',
                            borderLeft:
                              '2px solid ' +
                              CALENDAR_EVENT_KIND_COLORS[e.kind as CalendarEventKind]
                          }}
                        >
                          {new Date(e.start_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}{' '}
                          {e.title}
                        </Link>
                      </li>
                    ))}
                    {c.events.length > 3 && (
                      <li className="text-[0.55rem] text-white/40">+{c.events.length - 3}</li>
                    )}
                  </ul>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">Legenda</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CALENDAR_EVENT_KIND_LABELS) as CalendarEventKind[]).map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-xs text-white/70"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: CALENDAR_EVENT_KIND_COLORS[k] }}
              />
              {CALENDAR_EVENT_KIND_LABELS[k]}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
