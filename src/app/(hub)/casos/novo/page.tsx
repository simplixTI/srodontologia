import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NewCaseForm } from './NewCaseForm';
import { listDentistsForSelect, listCaseTypesForSelect } from '@/features/cases/queries';
import { listClinicsForSelect } from '@/features/dentists/queries';

export const metadata: Metadata = { title: 'Novo caso · SR HUB' };
export const dynamic = 'force-dynamic';

export default async function NewCasePage() {
  const [dentists, clinics, caseTypes] = await Promise.all([
    listDentistsForSelect(),
    listClinicsForSelect(),
    listCaseTypesForSelect()
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/casos"
        className="group inline-flex items-center gap-2 self-start text-[0.65rem] uppercase tracking-[0.32em] text-white/60 transition hover:text-gold-100"
      >
        <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
        Voltar
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Novo caso
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>
        <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
          Iniciar <span className="gold-text italic">caso.</span>
        </h1>
        <p className="text-sm text-white/60">
          Preencha o essencial para abrir o rascunho. Você poderá completar
          descrição clínica, prazo, checklist e arquivos na próxima etapa.
        </p>
      </header>

      <div className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-8">
        <NewCaseForm dentists={dentists} clinics={clinics} caseTypes={caseTypes} />
      </div>
    </div>
  );
}
