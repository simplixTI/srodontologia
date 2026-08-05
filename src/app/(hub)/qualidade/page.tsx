import type { Metadata } from 'next';
import Link from 'next/link';
import { FileCog, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { getMetrics, listInspections } from '@/features/qc/queries';
import { QC_STATUS_COLORS, QC_STATUS_LABELS } from '@/features/qc/types';

export const metadata: Metadata = { title: 'Qualidade · SR HUB' };
export const dynamic = 'force-dynamic';

export default async function QualidadePage({
  searchParams
}: {
  searchParams?: { status?: string };
}) {
  const status = (searchParams?.status as
    | 'pending'
    | 'in_progress'
    | 'passed'
    | 'failed'
    | 'cancelled'
    | undefined) ?? undefined;

  const [metrics, inspections] = await Promise.all([
    getMetrics(),
    listInspections(status ? { status } : undefined)
  ]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Fluxo · Qualidade
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
              Controle de Qualidade
            </h1>
            <p className="mt-3 max-w-2xl text-white/60">
              Inspeções aprovam ou reprovam cartões da produção. Reprovações movem o cartão
              automaticamente para a etapa de retrabalho.
            </p>
          </div>
          <Link
            href="/qualidade/templates"
            className="btn-outline-gold inline-flex h-11 items-center gap-2 rounded-full px-5 text-[0.68rem] uppercase tracking-[0.22em]"
          >
            <FileCog className="h-4 w-4" strokeWidth={1.5} /> Templates
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiTile label="Abertas" value={String(metrics?.open_total ?? 0)} tone="blue" />
        <KpiTile label="Aprovadas (7d)" value={String(metrics?.passed_7d ?? 0)} tone="emerald" />
        <KpiTile label="Reprovadas (7d)" value={String(metrics?.failed_7d ?? 0)} tone="red" />
        <KpiTile label="Total aprovado" value={String(metrics?.passed_total ?? 0)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip label="Todas" href="/qualidade" active={!status} />
        {(['pending', 'in_progress', 'passed', 'failed', 'cancelled'] as const).map((s) => (
          <FilterChip
            key={s}
            label={QC_STATUS_LABELS[s]}
            href={`/qualidade?status=${s}`}
            active={status === s}
          />
        ))}
      </div>

      {inspections.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-gold/10 bg-white/[0.02] p-14 text-center">
          <ShieldCheck className="h-6 w-6 text-gold-300" strokeWidth={1.5} />
          <h2 className="mt-4 font-display text-2xl text-white">Sem inspeções</h2>
          <p className="mt-3 text-sm text-white/60">
            Cadastre templates para começar a inspecionar casos.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {inspections.map((i) => (
            <li key={i.id} className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5 hover:border-gold/30">
              <Link href={`/qualidade/${i.id}`} className="block">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white">
                      {i.case_number ?? 'Caso'} — {i.case_title ?? 'Sem título'}
                    </div>
                    <div className="mt-0.5 text-[0.65rem] text-white/50">
                      {i.checklist_name ?? 'Sem template'}
                      {i.patient_initials && <> · Paciente {i.patient_initials}</>}
                    </div>
                  </div>
                  <span
                    className={
                      'shrink-0 rounded-full border px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.2em] ' +
                      QC_STATUS_COLORS[i.status]
                    }
                  >
                    {QC_STATUS_LABELS[i.status]}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-[0.6rem] text-white/40">
                  {i.finished_at ? (
                    <>
                      {i.status === 'passed' ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-300" strokeWidth={1.5} />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-300" strokeWidth={1.5} />
                      )}
                      Finalizada em {new Date(i.finished_at).toLocaleDateString('pt-BR')}
                    </>
                  ) : (
                    <>Aberta em {new Date(i.created_at).toLocaleDateString('pt-BR')}</>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KpiTile({ label, value, tone }: { label: string; value: string; tone?: 'blue' | 'emerald' | 'red' }) {
  const color =
    tone === 'blue'
      ? 'text-blue-200'
      : tone === 'emerald'
        ? 'text-emerald-200'
        : tone === 'red'
          ? 'text-red-200'
          : 'text-white';
  return (
    <div className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4">
      <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">{label}</div>
      <div className={`mt-2 font-display text-3xl ${color}`}>{value}</div>
    </div>
  );
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        'rounded-full border px-3 py-1 text-xs transition ' +
        (active ? 'border-gold/60 bg-gold/10 text-gold-100' : 'border-white/10 text-white/60 hover:border-white/30')
      }
    >
      {label}
    </Link>
  );
}
