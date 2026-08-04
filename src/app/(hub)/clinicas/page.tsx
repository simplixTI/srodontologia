import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Building2, MapPin, Mail, Phone } from 'lucide-react';
import { listClinics } from '@/features/clinics/queries';

export const metadata: Metadata = { title: 'Clínicas · SR HUB' };
export const dynamic = 'force-dynamic';

export default async function ClinicsPage({
  searchParams
}: {
  searchParams?: { q?: string };
}) {
  const search = searchParams?.q?.trim() ?? '';
  const clinics = await listClinics({ search });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Sistema · Clínicas
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>

        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
              Clínicas
            </h1>
            <p className="mt-3 max-w-2xl text-white/60">
              Empresas cadastradas na SR Digital. Cada dentista pode atuar em
              uma ou mais clínicas — vincule pela ficha do dentista.
            </p>
          </div>

          <Link
            href="/clinicas/nova"
            className="btn-gold group inline-flex h-12 items-center gap-2 rounded-full px-6 text-[0.72rem] uppercase tracking-[0.22em]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} /> Nova clínica
          </Link>
        </div>
      </header>

      <form action="/clinicas" method="get" className="flex items-center gap-3">
        <input
          name="q"
          defaultValue={search}
          placeholder="Buscar por nome fantasia..."
          className="h-11 flex-1 rounded-xl border border-gold/15 bg-black/40 px-4 text-sm text-white placeholder-white/30 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25"
        />
        <button
          type="submit"
          className="h-11 rounded-xl border border-gold/25 px-5 text-[0.65rem] uppercase tracking-[0.28em] text-gold-100 hover:bg-gold/5"
        >
          Buscar
        </button>
      </form>

      {clinics.length === 0 ? (
        <EmptyState hasSearch={!!search} />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clinics.map((c) => (
            <Link
              key={c.id}
              href={`/clinicas/${c.id}`}
              className="group flex flex-col gap-4 overflow-hidden rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 card-hover"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-gold/20 bg-black/40">
                  <Building2 className="h-4 w-4 text-gold-100" strokeWidth={1.4} />
                </div>
                <span
                  className={
                    c.active
                      ? 'inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.3em] text-emerald-200'
                      : 'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.3em] text-white/40'
                  }
                >
                  <span
                    className={
                      c.active ? 'h-1 w-1 rounded-full bg-emerald-400' : 'h-1 w-1 rounded-full bg-white/30'
                    }
                  />
                  {c.active ? 'Ativa' : 'Inativa'}
                </span>
              </div>

              <div>
                <h3 className="font-display text-xl leading-tight text-white">{c.trade_name}</h3>
                {c.legal_name && (
                  <p className="mt-1 text-xs text-white/45">{c.legal_name}</p>
                )}
              </div>

              <ul className="mt-auto space-y-2 pt-2 text-xs text-white/60">
                {(c.city || c.state) && (
                  <li className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
                    {[c.city, c.state].filter(Boolean).join(' · ')}
                  </li>
                )}
                {c.email && (
                  <li className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
                    {c.email}
                  </li>
                )}
                {c.phone && (
                  <li className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
                    {c.phone}
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
        {hasSearch ? 'Nenhuma clínica encontrada' : 'Nenhuma clínica cadastrada'}
      </h2>
      <p className="mt-3 text-sm text-white/60">
        {hasSearch
          ? 'Ajuste a busca ou cadastre uma nova clínica.'
          : 'Comece cadastrando a primeira clínica parceira.'}
      </p>
      <Link
        href="/clinicas/nova"
        className="btn-gold mt-8 inline-flex h-11 items-center gap-2 rounded-full px-6 text-[0.7rem] uppercase tracking-[0.22em]"
      >
        <Plus className="h-4 w-4" strokeWidth={2} /> Nova clínica
      </Link>
    </div>
  );
}
