import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { listCollections } from '@/features/dam/queries';
import { CollectionsPanel } from './CollectionsPanel';

export const metadata: Metadata = { title: 'Coleções · Arquivos' };
export const dynamic = 'force-dynamic';

export default async function ColecoesPage() {
  const collections = await listCollections();
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/arquivos"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>
      <header>
        <h1 className="font-display text-3xl text-white md:text-4xl">Coleções</h1>
        <p className="mt-2 text-sm text-white/60">
          Pastas virtuais para organizar arquivos independente do caso.
        </p>
      </header>
      {collections.length === 0 ? (
        <div className="mx-auto mt-6 flex max-w-md flex-col items-center rounded-3xl border border-gold/10 bg-white/[0.02] p-14 text-center">
          <FolderOpen className="h-6 w-6 text-gold-300" strokeWidth={1.5} />
          <h2 className="mt-4 font-display text-2xl text-white">Nenhuma coleção</h2>
          <p className="mt-3 text-sm text-white/60">Crie uma coleção para agrupar arquivos.</p>
        </div>
      ) : null}
      <CollectionsPanel initialCollections={collections} />
    </div>
  );
}
