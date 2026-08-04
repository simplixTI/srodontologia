import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { UserCircle2, Building2, Briefcase, Calendar, Clock } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { getCase, getCaseTimeline, listCaseChecklist, listDentistsForSelect, listCaseTypesForSelect } from '@/features/cases/queries';
import { listCaseFiles, countFilesPerChecklistItem } from '@/features/files/queries';
import { listClinicsForSelect } from '@/features/dentists/queries';
import { listCaseMessages } from '@/features/messages/queries';
import { listCaseQuotes } from '@/features/quotes/queries';
import { listCasePlanning } from '@/features/planning/queries';
import { listCaseDeliveries } from '@/features/deliveries/queries';
import { CaseTabs } from './CaseTabs';
import { HealthScore } from './HealthScore';
import { PUBLIC_STATUS_LABELS, CASE_PRIORITY_LABELS, type CasePriority } from '@/lib/validations/cases';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params
}: {
  params: { id: string };
}): Promise<Metadata> {
  const c = await getCase(params.id);
  return { title: c ? `${c.case_number} · ${c.title} · SR HUB` : 'Caso · SR HUB' };
}

export default async function CaseDetailPage({
  params
}: {
  params: { id: string };
}) {
  const [
    caseRow, timeline, checklist,
    files, filesPerItem,
    messages, quotes, planning, deliveries,
    dentists, clinics, caseTypes
  ] = await Promise.all([
    getCase(params.id),
    getCaseTimeline(params.id),
    listCaseChecklist(params.id),
    listCaseFiles(params.id),
    countFilesPerChecklistItem(params.id),
    listCaseMessages(params.id),
    listCaseQuotes(params.id),
    listCasePlanning(params.id),
    listCaseDeliveries(params.id),
    listDentistsForSelect(),
    listClinicsForSelect(),
    listCaseTypesForSelect()
  ]);
  if (!caseRow) notFound();

  const isDraft = caseRow.internal_status === 'draft';

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Casos', href: '/casos' },
          { label: caseRow.case_number }
        ]}
      />

      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[0.65rem] tracking-[0.3em] text-white/40">
            {caseRow.case_number}
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
          <span className="rounded-full border border-gold/20 bg-gold/5 px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100">
            {PUBLIC_STATUS_LABELS[caseRow.public_status] ?? caseRow.public_status}
          </span>
          {caseRow.priority !== 'normal' && (
            <span
              className={
                caseRow.priority === 'urgent'
                  ? 'rounded-full border border-rose-400/30 bg-rose-400/10 px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-rose-200'
                  : caseRow.priority === 'high'
                  ? 'rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-amber-200'
                  : 'rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-white/50'
              }
            >
              {CASE_PRIORITY_LABELS[caseRow.priority as CasePriority]}
            </span>
          )}
        </div>

        <h1 className="font-display text-3xl leading-tight text-white md:text-4xl">
          {caseRow.title}
        </h1>

        {/* Quick facts */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/60">
          {caseRow.dentist && (
            <span className="inline-flex items-center gap-1.5">
              <UserCircle2 className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
              {caseRow.dentist.full_name}
              {caseRow.dentist.cro_state && caseRow.dentist.cro_number && (
                <span className="text-white/40"> · CRO {caseRow.dentist.cro_state}-{caseRow.dentist.cro_number}</span>
              )}
            </span>
          )}
          {caseRow.clinic && (
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
              {caseRow.clinic.trade_name}
            </span>
          )}
          {caseRow.case_type && (
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
              {caseRow.case_type.name}
            </span>
          )}
          {caseRow.requested_delivery_date && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
              Prazo {new Date(caseRow.requested_delivery_date).toLocaleDateString('pt-BR')}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
            Atualizado {new Date(caseRow.updated_at).toLocaleString('pt-BR')}
          </span>
        </div>
      </header>

      {/* Health score band */}
      <HealthScore
        score={caseRow.health_score}
        missing={caseRow.missing_required_items_count}
        totalRequired={checklist.filter((i) => i.required_snapshot).length}
        canSubmit={isDraft}
        caseId={caseRow.id}
      />

      {/* Tabs */}
      <CaseTabs
        caseRow={caseRow}
        checklist={checklist}
        timeline={timeline}
        files={files}
        filesPerItem={filesPerItem}
        messages={messages}
        quotes={quotes}
        planning={planning}
        deliveries={deliveries}
        dentists={dentists}
        clinics={clinics}
        caseTypes={caseTypes}
      />
    </div>
  );
}
