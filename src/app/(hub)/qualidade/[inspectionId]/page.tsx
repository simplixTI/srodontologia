import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getInspection, listInspectionItems } from '@/features/qc/queries';
import { QC_STATUS_COLORS, QC_STATUS_LABELS } from '@/features/qc/types';
import { InspectionForm } from './InspectionForm';

export const metadata: Metadata = { title: 'Inspeção QC · SR HUB' };
export const dynamic = 'force-dynamic';

export default async function InspectionPage({ params }: { params: { inspectionId: string } }) {
  const [inspection, items] = await Promise.all([
    getInspection(params.inspectionId),
    listInspectionItems(params.inspectionId)
  ]);
  if (!inspection) notFound();

  const finished = ['passed', 'failed', 'cancelled'].includes(inspection.status);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/qualidade"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>

      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl text-white md:text-4xl">Inspeção QC</h1>
          <div className="mt-1 text-sm text-white/60">
            Iniciada em {new Date(inspection.created_at).toLocaleString('pt-BR')}
            {inspection.finished_at && (
              <> · Finalizada em {new Date(inspection.finished_at).toLocaleString('pt-BR')}</>
            )}
          </div>
        </div>
        <span
          className={
            'rounded-full border px-3 py-1 text-[0.6rem] uppercase tracking-[0.22em] ' +
            QC_STATUS_COLORS[inspection.status]
          }
        >
          {QC_STATUS_LABELS[inspection.status]}
        </span>
      </header>

      <InspectionForm inspection={inspection} initialItems={items} readOnly={finished} />
    </div>
  );
}
