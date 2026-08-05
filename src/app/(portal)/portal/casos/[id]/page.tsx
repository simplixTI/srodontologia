import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import {
  getPortalCase,
  listPortalChecklist,
  listPortalCaseFiles,
  listPortalQuotes,
  listPortalQuoteItems,
  listPortalPlanning,
  listPortalDeliveries,
  listPortalMessages,
  getPortalCaseTimeline
} from '@/features/portal/case-queries';
import { PUBLIC_STATUS_LABELS } from '@/lib/validations/cases';
import { PortalCaseTabs } from './PortalCaseTabs';

export const metadata: Metadata = {
  title: 'Caso · Portal SR Digital'
};

export default async function PortalCaseDetailPage({
  params
}: {
  params: { id: string };
}) {
  const c = await getPortalCase(params.id);
  if (!c) notFound();

  const [checklist, files, quotes, planning, deliveries, messages, timeline] =
    await Promise.all([
      listPortalChecklist(c.id),
      listPortalCaseFiles(c.id),
      listPortalQuotes(c.id),
      listPortalPlanning(c.id),
      listPortalDeliveries(c.id),
      listPortalMessages(c.id),
      getPortalCaseTimeline(c.id)
    ]);

  const quoteItems = await listPortalQuoteItems(quotes.map((q) => q.id));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 md:px-8 md:py-10">
      <Link
        href="/portal/casos"
        className="inline-flex items-center gap-1 text-[0.6rem] uppercase tracking-[0.28em] text-white/50 hover:text-white"
      >
        <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
        Voltar aos casos
      </Link>

      {/* Header */}
      <header className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/40">
              {c.case_number}
            </div>
            <h1 className="mt-1 font-display text-2xl leading-tight text-white md:text-3xl">
              {c.title}
            </h1>
            <div className="mt-2 text-xs text-white/50">
              {c.case_type?.name ?? 'Tipo não definido'}
              {c.clinic?.trade_name ? ` · ${c.clinic.trade_name}` : ''}
            </div>
          </div>
          <span className="whitespace-nowrap rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[0.55rem] uppercase tracking-[0.22em] text-gold-100">
            {PUBLIC_STATUS_LABELS[c.public_status]}
          </span>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
          <MetaField label="Solicitado" value={formatDate(c.requested_delivery_date)} />
          <MetaField label="Previsto" value={formatDate(c.estimated_delivery_date)} />
          <MetaField label="Entregue" value={formatDate(c.actual_delivery_date)} />
          <MetaField
            label="Criado em"
            value={new Date(c.created_at).toLocaleDateString('pt-BR')}
          />
        </dl>
      </header>

      <PortalCaseTabs
        caseId={c.id}
        internalStatus={c.internal_status}
        publicStatus={c.public_status}
        clinicalDescription={c.clinical_description}
        material={c.material}
        shade={c.shade}
        checklist={checklist}
        files={files}
        quotes={quotes}
        quoteItems={Object.fromEntries(quoteItems)}
        planning={planning}
        deliveries={deliveries}
        messages={messages}
        timeline={timeline}
        canSubmit={c.internal_status === 'draft'}
      />
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.55rem] uppercase tracking-[0.25em] text-white/40">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-white">{value}</dd>
    </div>
  );
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}
