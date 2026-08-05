import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ChecklistCreateForm } from './ChecklistCreateForm';

export const metadata: Metadata = { title: 'Novo template QC · SR HUB' };
export const dynamic = 'force-dynamic';

export default function NovoQcTemplatePage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/qualidade/templates"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>
      <header>
        <h1 className="font-display text-3xl text-white md:text-4xl">Novo template QC</h1>
        <p className="mt-2 text-sm text-white/60">
          Depois de criar, adicione os itens do checklist. Item crítico pode ser destacado.
        </p>
      </header>
      <ChecklistCreateForm />
    </div>
  );
}
