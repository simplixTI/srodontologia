import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Sparkles } from 'lucide-react';
import { listLeads } from '@/features/leads/queries';
import { LeadsKanban } from './LeadsKanban';

export const metadata: Metadata = { title: 'Leads · SR HUB' };
export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const leads = await listLeads();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            CRM · Pipeline
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>

        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
              CRM — Pipeline
            </h1>
            <p className="mt-3 max-w-2xl text-white/60">
              Prospects e clientes por etapa. Total: <strong className="text-white">{leads.length}</strong>{' '}
              {leads.length === 1 ? 'lead' : 'leads'}.
            </p>
            <p className="mt-1 text-xs text-white/40">
              Arraste cards entre colunas para mudar a etapa — persistência
              automática no banco + registro de atividade.
            </p>
          </div>

          <Link
            href="/leads/novo"
            className="btn-gold group inline-flex h-12 items-center gap-2 rounded-full px-6 text-[0.72rem] uppercase tracking-[0.22em]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} /> Novo lead
          </Link>
        </div>
      </header>

      {leads.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-gold/10 bg-white/[0.02] p-14 text-center">
          <Sparkles className="h-6 w-6 text-gold-300" strokeWidth={1.5} />
          <h2 className="mt-4 font-display text-2xl text-white">Nenhum lead cadastrado</h2>
          <p className="mt-3 text-sm text-white/60">
            Cadastre o primeiro lead para iniciar o pipeline comercial.
          </p>
          <Link
            href="/leads/novo"
            className="btn-gold mt-8 inline-flex h-11 items-center gap-2 rounded-full px-6 text-[0.7rem] uppercase tracking-[0.22em]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} /> Novo lead
          </Link>
        </div>
      ) : (
        <LeadsKanban initialLeads={leads} />
      )}
    </div>
  );
}
