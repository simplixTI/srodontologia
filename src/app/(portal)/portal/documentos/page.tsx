import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Documentos · Portal SR Digital'
};

export default function PortalDocumentosPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
          Documentos
        </div>
        <h1 className="mt-1 font-display text-2xl text-white md:text-3xl">
          Arquivos, orçamentos e comprovantes
        </h1>
      </header>

      <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/60">
        <p>
          O acervo consolidado de todos os seus documentos chega em breve.
          Enquanto isso, os arquivos ficam disponíveis dentro de cada caso.
        </p>
        <Link
          href="/portal/casos"
          className="mt-4 inline-flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:text-gold-50"
        >
          Ver meus casos <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}
