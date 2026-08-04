import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NewCaseTypeForm } from './NewCaseTypeForm';

export const metadata: Metadata = { title: 'Novo tipo de caso · SR HUB' };

export default function NewCaseTypePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-10 md:px-10">
      <Link
        href="/checklists"
        className="group inline-flex items-center gap-2 self-start text-[0.65rem] uppercase tracking-[0.32em] text-white/60 transition hover:text-gold-100"
      >
        <ArrowLeft className="h-3 w-3 transition-transform duration-500 group-hover:-translate-x-0.5" />
        Voltar
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Novo tipo de caso
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>
        <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
          Criar <span className="gold-text italic">tipo de caso.</span>
        </h1>
        <p className="max-w-lg text-sm text-white/60">
          Depois de criar, você poderá adicionar cada item do checklist (STL, fotos,
          tomografia, cor, material, notas etc.).
        </p>
      </header>

      <div className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-8">
        <NewCaseTypeForm />
      </div>
    </div>
  );
}
