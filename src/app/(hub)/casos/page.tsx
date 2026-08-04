import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Briefcase, UserCircle2, Building2, Calendar, Clock } from 'lucide-react';
import { listCases } from '@/features/cases/queries';
import { calcSla, slaBadgeClass } from '@/features/cases/sla';
import { PUBLIC_STATUS_LABELS, CASE_PRIORITY_LABELS, type CasePriority } from '@/lib/validations/cases';
import { FilterSelect } from './FilterSelect';

export const metadata: Metadata = { title: 'Casos · SR HUB' };
export const dynamic = 'force-dynamic';

const priorityColor: Record<CasePriority, string> = {
  low: 'text-white/50',
  normal: 'text-white/70',
  high: 'text-amber-300',
  urgent: 'text-rose-300'
};

function healthBand(score: number) {
  if (score >= 90) return { label: 'Excelente', cls: 'text-emerald-200 border-emerald-400/30 bg-emerald-400/10' };
  if (score >= 70) return { label: 'Bom',       cls: 'text-teal-200 border-teal-400/30 bg-teal-400/10' };
  if (score >= 50) return { label: 'Incompleto', cls: 'text-amber-200 border-amber-400/30 bg-amber-400/10' };
  return { label: 'Crítico',                    cls: 'text-rose-200 border-rose-400/30 bg-rose-400/10' };
}

const SLA_FILTERS = [
  { key: '',           label: 'Todos' },
  { key: 'overdue',    label: 'Atrasados' },
  { key: 'due_today',  label: 'Vencem hoje' },
  { key: 'at_risk',    label: 'Risco (≤ 2d)' },
  { key: 'on_track',   label: 'No prazo' },
  { key: 'delivered',  label: 'Entregues' }
] as const;

const STATUS_FILTERS = [
  { key: '',                    label: 'Todos os status' },
  { key: 'draft',               label: 'Rascunho' },
  { key: 'submitted',           label: 'Enviado' },
  { key: 'under_review',        label: 'Em análise' },
  { key: 'missing_information', label: 'Info pendentes' },
  { key: 'production_queue',    label: 'Fila de produção' },
  { key: 'quality_control',     label: 'Controle qualidade' },
  { key: 'ready_for_dispatch',  label: 'Pronto p/ envio' },
  { key: 'dispatched',          label: 'Despachado' },
  { key: 'delivered',           label: 'Entregue' },
  { key: 'completed',           label: 'Finalizado' },
  { key: 'cancelled',           label: 'Cancelado' }
] as const;

const PRIORITY_FILTERS = [
  { key: '',       label: 'Todas prioridades' },
  { key: 'urgent', label: 'Urgente' },
  { key: 'high',   label: 'Alta' },
  { key: 'normal', label: 'Normal' },
  { key: 'low',    label: 'Baixa' }
] as const;

type Params = { q?: string; status?: string; priority?: string; sla?: string };

function buildHref(base: Params, override: Partial<Params>): string {
  const merged: Params = { ...base, ...override };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v && String(v).length > 0) p.set(k, String(v));
  }
  const qs = p.toString();
  return qs ? `/casos?${qs}` : '/casos';
}

export default async function CasesPage({
  searchParams
}: {
  searchParams?: Params;
}) {
  const search = searchParams?.q?.trim() ?? '';
  const status = searchParams?.status ?? '';
  const priority = searchParams?.priority ?? '';
  const sla = searchParams?.sla ?? '';

  const cases = await listCases({
    search,
    status: status || undefined,
    priority: priority || undefined,
    slaBucket: (sla || undefined) as ('overdue' | 'due_today' | 'at_risk' | 'on_track' | 'delivered' | undefined)
  });

  const drafts = cases.filter((c) => c.internal_status === 'draft').length;
  const inFlight = cases.filter(
    (c) => c.internal_status !== 'draft' && c.internal_status !== 'completed' && c.internal_status !== 'cancelled'
  ).length;
  const completed = cases.filter((c) => c.internal_status === 'completed').length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Operação · Casos
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>

        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
              Casos clínicos
            </h1>
            <p className="mt-3 max-w-2xl text-white/60">
              Todos os casos abertos, em produção ou concluídos.{' '}
              <strong className="text-white">{drafts}</strong> rascunho{drafts !== 1 ? 's' : ''} ·{' '}
              <strong className="text-white">{inFlight}</strong> em andamento ·{' '}
              <strong className="text-white">{completed}</strong> concluído{completed !== 1 ? 's' : ''}.
            </p>
          </div>

          <Link
            href="/casos/novo"
            className="btn-gold group inline-flex h-12 items-center gap-2 rounded-full px-6 text-[0.72rem] uppercase tracking-[0.22em]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} /> Novo caso
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <form action="/casos" method="get" className="flex items-center gap-3">
          {/* Preserve current filters when submitting search */}
          {status && <input type="hidden" name="status" value={status} />}
          {priority && <input type="hidden" name="priority" value={priority} />}
          {sla && <input type="hidden" name="sla" value={sla} />}
          <input
            name="q"
            defaultValue={search}
            placeholder="Buscar por título ou número do caso..."
            className="h-11 flex-1 rounded-xl border border-gold/15 bg-black/40 px-4 text-sm text-white placeholder-white/30 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25"
          />
          <button
            type="submit"
            className="h-11 rounded-xl border border-gold/25 px-5 text-[0.65rem] uppercase tracking-[0.28em] text-gold-100 hover:bg-gold/5"
          >
            Buscar
          </button>
        </form>

        {/* SLA pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[0.55rem] uppercase tracking-[0.3em] text-white/40 mr-1">Prazo:</span>
          {SLA_FILTERS.map((f) => (
            <Link
              key={f.key || 'all'}
              href={buildHref({ q: search, status, priority }, { sla: f.key })}
              className={
                'inline-flex h-7 items-center rounded-full border px-3 text-[0.55rem] uppercase tracking-[0.28em] transition ' +
                (sla === f.key
                  ? 'border-gold/60 bg-gold/10 text-gold-100'
                  : 'border-white/10 bg-white/[0.02] text-white/50 hover:border-gold/30 hover:text-white')
              }
            >
              {f.label}
            </Link>
          ))}
        </div>

        {/* Status + Priority selects */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[0.55rem] uppercase tracking-[0.3em] text-white/40">Status:</span>
            <FilterSelect
              name="status"
              value={status}
              options={STATUS_FILTERS}
              preserve={{ q: search, priority, sla }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[0.55rem] uppercase tracking-[0.3em] text-white/40">Prioridade:</span>
            <FilterSelect
              name="priority"
              value={priority}
              options={PRIORITY_FILTERS}
              preserve={{ q: search, status, sla }}
            />
          </div>
          {(search || status || priority || sla) && (
            <Link
              href="/casos"
              className="inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/[0.02] px-3 text-[0.55rem] uppercase tracking-[0.28em] text-white/50 transition hover:border-rose-400/30 hover:text-rose-200"
            >
              limpar filtros
            </Link>
          )}
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-gold/10 bg-white/[0.02] p-14 text-center">
          <Briefcase className="h-6 w-6 text-gold-300" strokeWidth={1.5} />
          <h2 className="mt-4 font-display text-2xl text-white">
            {search ? 'Nenhum caso encontrado' : 'Nenhum caso ainda'}
          </h2>
          <p className="mt-3 text-sm text-white/60">
            {search
              ? 'Ajuste a busca ou crie um novo caso.'
              : 'Crie o primeiro caso clínico. O checklist será instanciado automaticamente a partir do tipo escolhido.'}
          </p>
          <Link
            href="/casos/novo"
            className="btn-gold mt-8 inline-flex h-11 items-center gap-2 rounded-full px-6 text-[0.7rem] uppercase tracking-[0.22em]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} /> Novo caso
          </Link>
        </div>
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cases.map((c) => {
            const band = healthBand(c.health_score);
            const sla = calcSla({
              requestedDeliveryDate: c.requested_delivery_date,
              estimatedDeliveryDate: c.estimated_delivery_date,
              actualDeliveryDate: c.actual_delivery_date,
              internalStatus: c.internal_status
            });
            return (
              <Link
                key={c.id}
                href={`/casos/${c.id}`}
                className="group flex flex-col gap-4 rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.04] to-transparent p-5 card-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 text-[0.6rem] uppercase tracking-[0.3em]">
                      <span className="font-mono text-white/40">{c.case_number}</span>
                      {c.priority !== 'normal' && (
                        <span className={priorityColor[c.priority as CasePriority] + ' font-medium'}>
                          {CASE_PRIORITY_LABELS[c.priority as CasePriority]}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 font-display text-lg leading-tight text-white line-clamp-2">
                      {c.title}
                    </h3>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.28em] ${band.cls}`}>
                      {c.health_score}%
                    </span>
                    {sla.status !== 'no_date' && sla.status !== 'on_track' && (
                      <span className={slaBadgeClass(sla.tone)}>{sla.label}</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-1.5 text-[0.65rem] text-white/55">
                  {c.dentist && (
                    <li className="flex items-center gap-2">
                      <UserCircle2 className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
                      {c.dentist.full_name}
                    </li>
                  )}
                  {c.clinic && (
                    <li className="flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
                      {c.clinic.trade_name}
                    </li>
                  )}
                  {c.case_type && (
                    <li className="flex items-center gap-2">
                      <Briefcase className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
                      {c.case_type.name}
                    </li>
                  )}
                  {c.requested_delivery_date && (
                    <li className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
                      Prazo: {new Date(c.requested_delivery_date).toLocaleDateString('pt-BR')}
                    </li>
                  )}
                </ul>

                <div className="mt-auto flex items-center justify-between pt-3">
                  <span className="rounded-full border border-gold/20 bg-gold/5 px-2.5 py-0.5 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100">
                    {PUBLIC_STATUS_LABELS[c.public_status as keyof typeof PUBLIC_STATUS_LABELS] ?? c.public_status}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[0.55rem] uppercase tracking-[0.28em] text-white/35">
                    <Clock className="h-2.5 w-2.5" strokeWidth={1.5} />
                    {new Date(c.updated_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
