import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Star } from 'lucide-react';
import { getTemplate, listTemplateItems } from '@/features/planning/queries';
import { TemplateItemsPanel } from './TemplateItemsPanel';

export const metadata: Metadata = { title: 'Template · Planejamento' };
export const dynamic = 'force-dynamic';

export default async function TemplatePage({ params }: { params: { templateId: string } }) {
  const [template, items] = await Promise.all([
    getTemplate(params.templateId),
    listTemplateItems(params.templateId)
  ]);
  if (!template) notFound();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/planejamento/templates"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="flex items-center gap-2 font-display text-3xl text-white md:text-4xl">
          {template.name}
          {template.is_default && (
            <Star className="h-5 w-5 text-gold-100" strokeWidth={1.5} fill="currentColor" />
          )}
        </h1>
        {template.description && (
          <p className="max-w-2xl text-sm text-white/60">{template.description}</p>
        )}
        <div className="text-[0.6rem] uppercase tracking-[0.22em] text-white/40">
          {template.is_active ? 'Ativo' : 'Inativo'} · Criado em{' '}
          {new Date(template.created_at).toLocaleDateString('pt-BR')}
        </div>
      </header>

      <TemplateItemsPanel templateId={template.id} initialItems={items} />
    </div>
  );
}
