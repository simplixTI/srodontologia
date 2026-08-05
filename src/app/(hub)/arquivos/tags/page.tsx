import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { listTags } from '@/features/dam/queries';
import { TagsPanel } from './TagsPanel';

export const metadata: Metadata = { title: 'Tags · Arquivos' };
export const dynamic = 'force-dynamic';

export default async function TagsPage() {
  const tags = await listTags();
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/arquivos"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>
      <header>
        <h1 className="font-display text-3xl text-white md:text-4xl">Tags de arquivos</h1>
      </header>
      <TagsPanel initialTags={tags} />
    </div>
  );
}
