import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Star } from 'lucide-react';
import { getChecklist, listChecklistItems } from '@/features/qc/queries';
import { ItemsPanel } from './ItemsPanel';

export const metadata: Metadata = { title: 'Template QC · SR HUB' };
export const dynamic = 'force-dynamic';

export default async function ChecklistPage({ params }: { params: { checklistId: string } }) {
  const [t, items] = await Promise.all([
    getChecklist(params.checklistId),
    listChecklistItems(params.checklistId)
  ]);
  if (!t) notFound();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/qualidade/templates"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>
      <header>
        <h1 className="flex items-center gap-2 font-display text-3xl text-white md:text-4xl">
          {t.name}
          {t.is_default && <Star className="h-5 w-5 text-gold-100" strokeWidth={1.5} fill="currentColor" />}
        </h1>
        {t.description && <p className="mt-2 text-sm text-white/60">{t.description}</p>}
      </header>
      <ItemsPanel checklistId={t.id} initialItems={items} />
    </div>
  );
}
