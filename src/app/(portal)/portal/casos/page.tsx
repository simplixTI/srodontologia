import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Plus, Search } from 'lucide-react';
import { listPortalCases } from '@/features/portal/queries';
import { PUBLIC_STATUS_LABELS, CASE_PRIORITY_LABELS } from '@/lib/validations/cases';
import { FilterSelect } from './FilterSelect';

export const metadata: Metadata = {
  title: 'Meus casos · Portal SR Digital'
};

const STATUS_OPTIONS = [
  { key: '', label: 'Todos os status' },
  ...Object.entries(PUBLIC_STATUS_LABELS).map(([key, label]) => ({ key, label }))
];

type Params = {
  q?: string;
  status?: string;
};

export default async function PortalCasosPage({
  searchParams
}: {
  searchParams?: Params;
}) {
  const search = searchParams?.q?.trim() ?? '';
  const status = searchParams?.status ?? '';

  const cases = await listPortalCases({
    search,
    status: status ? (status as never) : undefined
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Meus casos
          </div>
          <h1 className="mt-1 font-display text-2xl text-white md:text-3xl">
            Casos em andamento
          </h1>
        </div>
        <Link
          href="/portal/casos/novo"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/40 bg-gold/[0.06] px-4 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-gold-100 transition hover:border-gold/70 hover:bg-gold/10"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          Novo caso
        </Link>
      </header>

      {/* Filtros */}
      <form className="flex flex-col gap-3 md:flex-row md:items-center" action="/portal/casos">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" strokeWidth={1.5} />
          <input
            name="q"
            defaultValue={search}
            placeholder="Buscar por título ou número do caso..."
            className="h-9 w-full rounded-lg border border-gold/15 bg-black/40 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none"
          />
        </div>
        <FilterSelect
          name="status"
          value={status}
          options={STATUS_OPTIONS}
          preserve={{ q: search }}
        />
        {status && (
          <input type="hidden" name="status" value={status} />
        )}
      </form>

      {/* Lista */}
      {cases.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-white/50">Nenhum caso encontrado.</p>
          <Link
            href="/portal/casos/novo"
            className="mt-4 inline-flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:text-gold-50"
          >
            Enviar um novo caso <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} />
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {cases.map((c) => (
            <li key={c.id}>
              <Link
                href={`/portal/casos/${c.id}`}
                className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition hover:border-gold/25 hover:bg-white/[0.04] md:flex-row md:items-center md:justify-between md:p-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[0.55rem] uppercase tracking-[0.25em] text-white/40">
                      {c.case_number}
                    </span>
                    <PriorityPill priority={c.priority} />
                  </div>
                  <div className="mt-1 truncate text-base text-white">{c.title}</div>
                  <div className="mt-0.5 text-[0.65rem] text-white/50">
                    {c.case_type?.name ?? 'Tipo não definido'}
                    {c.clinic?.trade_name ? ` · ${c.clinic.trade_name}` : ''}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                  <StatusPill status={c.public_status} />
                  <span className="text-[0.6rem] uppercase tracking-[0.22em] text-white/40">
                    {formatDeliveryLabel(c)}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-white/40" strokeWidth={1.5} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusPill({
  status
}: {
  status: keyof typeof PUBLIC_STATUS_LABELS;
}) {
  const cls = statusColor(status);
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[0.55rem] uppercase tracking-[0.22em] ${cls}`}
    >
      {PUBLIC_STATUS_LABELS[status]}
    </span>
  );
}

function statusColor(s: keyof typeof PUBLIC_STATUS_LABELS): string {
  switch (s) {
    case 'awaiting_your_approval':
    case 'quote_available':
    case 'planning_available':
      return 'border-gold/40 bg-gold/10 text-gold-100';
    case 'shipped':
    case 'preparing_shipment':
      return 'border-blue-400/40 bg-blue-400/10 text-blue-200';
    case 'delivered':
    case 'completed':
      return 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200';
    case 'cancelled':
      return 'border-red-400/40 bg-red-400/10 text-red-200';
    case 'draft':
      return 'border-white/15 bg-white/5 text-white/60';
    default:
      return 'border-white/15 bg-white/5 text-white/80';
  }
}

function PriorityPill({ priority }: { priority: keyof typeof CASE_PRIORITY_LABELS }) {
  if (priority === 'normal' || priority === 'low') return null;
  const cls =
    priority === 'urgent'
      ? 'border-red-400/40 bg-red-400/10 text-red-200'
      : 'border-orange-400/40 bg-orange-400/10 text-orange-200';
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[0.5rem] uppercase tracking-[0.22em] ${cls}`}
    >
      {CASE_PRIORITY_LABELS[priority]}
    </span>
  );
}

function formatDeliveryLabel(c: {
  actual_delivery_date: string | null;
  estimated_delivery_date: string | null;
  requested_delivery_date: string | null;
}) {
  const d =
    c.actual_delivery_date ??
    c.estimated_delivery_date ??
    c.requested_delivery_date;
  if (!d) return '—';
  const label = c.actual_delivery_date
    ? 'Entregue'
    : c.estimated_delivery_date
      ? 'Prev.'
      : 'Sol.';
  return `${label} ${new Date(d).toLocaleDateString('pt-BR')}`;
}
