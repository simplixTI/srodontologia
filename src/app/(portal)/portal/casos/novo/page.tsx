import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { listCaseTypesForPortalWizard } from '@/features/portal/case-queries';
import { NewCaseWizard } from './NewCaseWizard';

export const metadata: Metadata = {
  title: 'Novo caso · Portal SR Digital'
};

export default async function PortalNovoCasoPage() {
  const caseTypes = await listCaseTypesForPortalWizard();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <Link
        href="/portal/casos"
        className="inline-flex items-center gap-1 text-[0.6rem] uppercase tracking-[0.28em] text-white/50 hover:text-white"
      >
        <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
        Voltar
      </Link>

      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
          Novo caso
        </div>
        <h1 className="mt-1 font-display text-2xl text-white md:text-3xl">
          Envie um caso ao laboratório
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Preencha o básico agora — você poderá anexar arquivos e completar o
          checklist na tela do caso.
        </p>
      </header>

      <NewCaseWizard caseTypes={caseTypes} />
    </div>
  );
}
