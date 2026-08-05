import type { Metadata } from 'next';
import Link from 'next/link';
import { ClipboardList, Sparkles, FileCog } from 'lucide-react';
import { listVersionsWithCase } from '@/features/planning/queries';
import { PLANNING_STATUS_COLORS, PLANNING_STATUS_LABELS } from '@/features/planning/types';

export const metadata: Metadata = { title: 'Planejamento · SR HUB' };
export const dynamic = 'force-dynamic';

export default async function PlanejamentoPage({
  searchParams
}: {
  searchParams?: { status?: string };
}) {
  const status = (searchParams?.status as
    | 'draft'
    | 'sent'
    | 'approved'
    | 'changes_requested'
    | 'obsolete'
    | undefined) ?? undefined;

  const versions = await listVersionsWithCase(status ? { status } : undefined);

  const byStatus = versions.reduce<Record<string, number>>((acc, v) => {
    acc[v.status] = (acc[v.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Fluxo · Planejamento
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
              Planejamento técnico
            </h1>
            <p className="mt-3 max-w-2xl text-white/60">
              Versionamento de planejamento, comentários, checklist e promoção para produção.
              Total exibido: <strong className="text-white">{versions.length}</strong>{' '}
              versão{versions.length === 1 ? '' : 'ões'}.
            </p>
          </div>
          <Link
            href="/planejamento/templates"
            className="btn-outline-gold inline-flex h-11 items-center gap-2 rounded-full px-5 text-[0.68rem] uppercase tracking-[0.22em]"
          >
            <FileCog className="h-4 w-4" strokeWidth={1.5} /> Templates
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip label="Todos" href="/planejamento" active={!status} count={versions.length} />
        {(['draft', 'sent', 'approved', 'changes_requested', 'obsolete'] as const).map((s) => (
          <FilterChip
            key={s}
            label={PLANNING_STATUS_LABELS[s]}
            href={`/planejamento?status=${s}`}
            active={status === s}
            count={byStatus[s] ?? 0}
          />
        ))}
      </div>

      {versions.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-gold/10 bg-white/[0.02] p-14 text-center">
          <Sparkles className="h-6 w-6 text-gold-300" strokeWidth={1.5} />
          <h2 className="mt-4 font-display text-2xl text-white">Sem planejamentos</h2>
          <p className="mt-3 text-sm text-white/60">
            Crie o primeiro planejamento a partir da aba Planejamento em um caso.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {versions.map((v) => (
            <li
              key={v.id}
              className="flex flex-col gap-2 rounded-2xl border border-gold/10 bg-white/[0.02] p-5 hover:border-gold/30"
            >
              <Link
                href={`/planejamento/${v.id}`}
                className="flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white">
                    {v.case_number ?? 'Caso'} — {v.case_title ?? 'Sem título'}
                  </div>
                  <div className="mt-0.5 text-[0.65rem] text-white/50">
                    Versão {v.version_number}
                    {v.dentist_name && <> · Dr(a). {v.dentist_name}</>}
                    {v.patient_initials && <> · Paciente {v.patient_initials}</>}
                  </div>
                </div>
                <span
                  className={
                    'shrink-0 rounded-full border px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.2em] ' +
                    PLANNING_STATUS_COLORS[v.status]
                  }
                >
                  {PLANNING_STATUS_LABELS[v.status]}
                </span>
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-[0.6rem] text-white/40">
                {v.approved_at && (
                  <span className="text-emerald-200/70">
                    aprovado em {new Date(v.approved_at).toLocaleDateString('pt-BR')}
                  </span>
                )}
                {v.promoted_to_production_at && (
                  <span className="text-gold-100">
                    ↦ produção {new Date(v.promoted_to_production_at).toLocaleDateString('pt-BR')}
                  </span>
                )}
                <span className="ml-auto">
                  criado {new Date(v.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              {v.technical_description && (
                <p className="line-clamp-3 text-xs text-white/60">{v.technical_description}</p>
              )}
              <div className="mt-2 flex items-center gap-3 text-[0.6rem] text-white/50">
                <ClipboardList className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
                Abrir detalhe
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  label,
  href,
  active,
  count
}: {
  label: string;
  href: string;
  active: boolean;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={
        'rounded-full border px-3 py-1 text-xs transition ' +
        (active ? 'border-gold/60 bg-gold/10 text-gold-100' : 'border-white/10 text-white/60 hover:border-white/30')
      }
    >
      {label} <span className="ml-1 text-white/40">{count}</span>
    </Link>
  );
}
