import type { Metadata } from 'next';
import { SmartSearch } from './SmartSearch';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Busca inteligente · SR HUB' };

export default function BuscaPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Inteligência</div>
        <h1 className="mt-1 font-display text-2xl text-white md:text-3xl">Busca inteligente</h1>
        <p className="mt-2 text-sm text-white/60">
          Pesquisa em casos, mensagens, dentistas, clínicas e pacientes usando o índice full-text (pt-BR).
        </p>
      </header>
      <SmartSearch />
    </div>
  );
}
