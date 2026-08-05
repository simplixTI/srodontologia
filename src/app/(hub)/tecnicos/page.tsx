import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, UserPlus, AlertTriangle } from 'lucide-react';
import { listTechnicians, listWorkload } from '@/features/technicians/queries';
import {
  TECH_STATUS_LABELS,
  type TechStatus
} from '@/lib/validations/production';

export const metadata: Metadata = { title: 'Técnicos · SR HUB' };
export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<TechStatus, string> = {
  active: 'border-emerald-400/40 text-emerald-200 bg-emerald-400/10',
  inactive: 'border-white/20 text-white/50 bg-white/[0.02]',
  vacation: 'border-cyan-400/40 text-cyan-200 bg-cyan-400/10',
  on_leave: 'border-amber-400/40 text-amber-200 bg-amber-400/10'
};

export default async function TecnicosPage() {
  const [technicians, workload] = await Promise.all([
    listTechnicians(),
    listWorkload()
  ]);

  const workloadByTech = new Map(workload.map((w) => [w.technician_id, w]));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Time · Técnicos
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
              Time técnico do laboratório
            </h1>
            <p className="mt-3 max-w-2xl text-white/60">
              {technicians.length} técnico{technicians.length === 1 ? '' : 's'} cadastrado
              {technicians.length === 1 ? '' : 's'}. Aqui você acompanha fila, retrabalho e
              produtividade em tempo real.
            </p>
          </div>
          <Link
            href="/tecnicos/novo"
            className="btn-gold group inline-flex h-12 items-center gap-2 rounded-full px-6 text-[0.72rem] uppercase tracking-[0.22em]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} /> Cadastrar técnico
          </Link>
        </div>
      </header>

      {technicians.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-gold/10 bg-white/[0.02] p-14 text-center">
          <UserPlus className="h-6 w-6 text-gold-300" strokeWidth={1.5} />
          <h2 className="mt-4 font-display text-2xl text-white">Nenhum técnico cadastrado</h2>
          <p className="mt-3 text-sm text-white/60">
            Adicione integrantes do time técnico para começar a distribuir cartões de produção.
          </p>
          <Link
            href="/tecnicos/novo"
            className="btn-gold mt-8 inline-flex h-11 items-center gap-2 rounded-full px-6 text-[0.7rem] uppercase tracking-[0.22em]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} /> Cadastrar
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {technicians.map((t) => {
            const w = workloadByTech.get(t.id);
            return (
              <li
                key={t.id}
                className="flex flex-col gap-3 rounded-2xl border border-gold/10 bg-white/[0.02] p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/tecnicos/${t.id}`}
                      className="block text-lg text-white hover:text-gold-100"
                    >
                      {t.name ?? '(sem nome)'}
                    </Link>
                    {t.specialty && (
                      <div className="mt-0.5 text-xs text-white/60">{t.specialty}</div>
                    )}
                    {t.team && <div className="text-[0.65rem] text-white/40">Time: {t.team}</div>}
                  </div>
                  <span
                    className={
                      'rounded-full border px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.2em] ' +
                      STATUS_COLORS[t.status]
                    }
                  >
                    {TECH_STATUS_LABELS[t.status]}
                  </span>
                </div>

                <dl className="mt-2 grid grid-cols-3 gap-2 text-center text-[0.6rem] uppercase tracking-[0.2em] text-white/40">
                  <div>
                    <dt>Fila</dt>
                    <dd className="mt-1 font-display text-lg text-white">
                      {w?.active_cards ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt>Atrasados</dt>
                    <dd className="mt-1 font-display text-lg text-red-200">
                      {w?.overdue_cards ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt>Retrabalho</dt>
                    <dd className="mt-1 font-display text-lg text-amber-200">
                      {w?.total_rework ?? 0}
                    </dd>
                  </div>
                </dl>

                {(w?.urgent_cards ?? 0) > 0 && (
                  <div className="inline-flex items-center gap-2 self-start rounded-full border border-red-400/40 bg-red-400/10 px-2 py-1 text-[0.55rem] text-red-200">
                    <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />
                    {w?.urgent_cards} urgente(s)
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
