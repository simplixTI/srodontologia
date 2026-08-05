import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TemplateCreateForm } from './TemplateCreateForm';

export const metadata: Metadata = { title: 'Novo template · Planejamento' };
export const dynamic = 'force-dynamic';

export default function NovoTemplatePage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/planejamento/templates"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>

      <header>
        <h1 className="font-display text-3xl text-white md:text-4xl">Novo template</h1>
        <p className="mt-2 text-sm text-white/60">
          Depois de criado, adicione os itens do checklist. Marque como padrão para aplicá-lo
          automaticamente.
        </p>
      </header>

      <TemplateCreateForm />
    </div>
  );
}
