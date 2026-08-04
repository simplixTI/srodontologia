import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getCaseType, listTemplatesForCaseType } from '@/features/checklists/queries';
import { EditCaseTypeCard } from './EditCaseTypeCard';
import { ItemsList } from './ItemsList';
import { NewItemForm } from './NewItemForm';
import { DentistPreview } from './DentistPreview';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params
}: {
  params: { id: string };
}): Promise<Metadata> {
  const t = await getCaseType(params.id);
  return { title: t ? `${t.name} · Checklist · SR HUB` : 'Checklist · SR HUB' };
}

export default async function CaseTypeEditorPage({
  params
}: {
  params: { id: string };
}) {
  const caseType = await getCaseType(params.id);
  if (!caseType) notFound();

  const items = await listTemplatesForCaseType(params.id);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 md:px-10">
      <Link
        href="/checklists"
        className="group inline-flex items-center gap-2 self-start text-[0.65rem] uppercase tracking-[0.32em] text-white/60 transition hover:text-gold-100"
      >
        <ArrowLeft className="h-3 w-3 transition-transform duration-500 group-hover:-translate-x-0.5" />
        Voltar aos tipos de caso
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Case Engine · {caseType.code}
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>
        <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
          {caseType.name}
        </h1>
        {caseType.description && (
          <p className="max-w-2xl text-white/60">{caseType.description}</p>
        )}
      </header>

      <EditCaseTypeCard caseType={caseType} />

      <section className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl text-white">Itens do checklist</h2>
              <p className="text-sm text-white/50">
                {items.length} {items.length === 1 ? 'item' : 'itens'} · {' '}
                {items.filter((x) => x.required).length} obrigatórios
              </p>
            </div>
          </div>

          <ItemsList items={items} />
          <NewItemForm caseTypeId={caseType.id} nextSortOrder={((items.at(-1)?.sort_order ?? 0) + 10)} />
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <DentistPreview caseTypeName={caseType.name} items={items} />
        </aside>
      </section>
    </div>
  );
}
