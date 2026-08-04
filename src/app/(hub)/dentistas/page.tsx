import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, UserCircle2, MapPin, Building2 } from 'lucide-react';
import { listDentists } from '@/features/dentists/queries';
import { CUSTOMER_STATUS_LABELS, type CustomerStatus } from '@/lib/validations/dentists';
import { statusColor } from '@/components/hub/crm/statusColors';

export const metadata: Metadata = { title: 'Dentistas · SR HUB' };
export const dynamic = 'force-dynamic';

export default async function DentistsPage({
  searchParams
}: {
  searchParams?: { q?: string };
}) {
  const search = searchParams?.q?.trim() ?? '';
  const dentists = await listDentists({ search });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            CRM · Dentistas
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>

        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
              Dentistas
            </h1>
            <p className="mt-3 max-w-2xl text-white/60">
              Base de clientes ativos, prospects convertidos e clientes premium.
              Cada dentista pode atuar em uma ou mais clínicas.
            </p>
          </div>

          <Link
            href="/dentistas/novo"
            className="btn-gold group inline-flex h-12 items-center gap-2 rounded-full px-6 text-[0.72rem] uppercase tracking-[0.22em]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} /> Novo dentista
          </Link>
        </div>
      </header>

      <form action="/dentistas" method="get" className="flex items-center gap-3">
        <input
          name="q"
          defaultValue={search}
          placeholder="Buscar por nome..."
          className="h-11 flex-1 rounded-xl border border-gold/15 bg-black/40 px-4 text-sm text-white placeholder-white/30 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25"
        />
        <button
          type="submit"
          className="h-11 rounded-xl border border-gold/25 px-5 text-[0.65rem] uppercase tracking-[0.28em] text-gold-100 hover:bg-gold/5"
        >
          Buscar
        </button>
      </form>

      {dentists.length === 0 ? (
        <EmptyState hasSearch={!!search} />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dentists.map((d) => (
            <Link
              key={d.id}
              href={`/dentistas/${d.id}`}
              className="group flex flex-col gap-4 rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 card-hover"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full border border-gold/20 bg-black/40">
                  <UserCircle2 className="h-5 w-5 text-gold-100" strokeWidth={1.4} />
                </div>
                <span className={statusColor(d.customer_status as CustomerStatus)}>
                  {CUSTOMER_STATUS_LABELS[d.customer_status as CustomerStatus] ?? d.customer_status}
                </span>
              </div>

              <div>
                <h3 className="font-display text-xl leading-tight text-white">{d.full_name}</h3>
                <p className="mt-1 text-xs text-white/50">
                  {[d.cro_state, d.cro_number].filter(Boolean).join('-') || 'CRO —'}
                  {d.specialty ? ` · ${d.specialty}` : ''}
                </p>
              </div>

              <ul className="mt-auto space-y-2 pt-2 text-xs text-white/60">
                {d.primary_clinic && (
                  <li className="flex items-center gap-2">
                    <Building2 className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
                    {d.primary_clinic.trade_name}
                  </li>
                )}
                {(d.city || d.state) && (
                  <li className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
                    {[d.city, d.state].filter(Boolean).join(' · ')}
                  </li>
                )}
              </ul>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-gold/10 bg-white/[0.02] p-14 text-center">
      <h2 className="font-display text-2xl text-white">
        {hasSearch ? 'Nenhum dentista encontrado' : 'Nenhum dentista cadastrado'}
      </h2>
      <p className="mt-3 text-sm text-white/60">
        {hasSearch
          ? 'Ajuste a busca ou cadastre um novo dentista.'
          : 'Cadastre o primeiro dentista para começar a receber casos.'}
      </p>
      <Link
        href="/dentistas/novo"
        className="btn-gold mt-8 inline-flex h-11 items-center gap-2 rounded-full px-6 text-[0.7rem] uppercase tracking-[0.22em]"
      >
        <Plus className="h-4 w-4" strokeWidth={2} /> Novo dentista
      </Link>
    </div>
  );
}
