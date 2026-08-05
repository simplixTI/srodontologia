import type { Metadata } from 'next';
import Link from 'next/link';
import { FolderOpen, Star, Tag as TagIcon } from 'lucide-react';
import { listCollections, listRecentFiles, listTags } from '@/features/dam/queries';
import { FilesGrid } from './FilesGrid';

export const metadata: Metadata = { title: 'Arquivos · SR HUB' };
export const dynamic = 'force-dynamic';

export default async function ArquivosPage() {
  const [files, tags, collections] = await Promise.all([
    listRecentFiles(60),
    listTags(),
    listCollections()
  ]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Estúdio · DAM</div>
          <h1 className="mt-2 font-display text-4xl leading-tight text-white md:text-5xl">
            Arquivos e ativos
          </h1>
          <p className="mt-2 text-sm text-white/60">
            {files.length} arquivo{files.length === 1 ? '' : 's'} · {tags.length} tag{tags.length === 1 ? '' : 's'}{' '}
            · {collections.length} coleção{collections.length === 1 ? '' : 'ões'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/arquivos/tags"
            className="btn-outline-gold inline-flex h-10 items-center gap-2 rounded-full px-4 text-[0.65rem] uppercase tracking-[0.22em]"
          >
            <TagIcon className="h-3.5 w-3.5" strokeWidth={1.5} /> Tags
          </Link>
          <Link
            href="/arquivos/colecoes"
            className="btn-outline-gold inline-flex h-10 items-center gap-2 rounded-full px-4 text-[0.65rem] uppercase tracking-[0.22em]"
          >
            <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.5} /> Coleções
          </Link>
          <Link
            href="/arquivos/favoritos"
            className="btn-outline-gold inline-flex h-10 items-center gap-2 rounded-full px-4 text-[0.65rem] uppercase tracking-[0.22em]"
          >
            <Star className="h-3.5 w-3.5" strokeWidth={1.5} /> Favoritos
          </Link>
        </div>
      </header>

      <FilesGrid initialFiles={files} tags={tags} />
    </div>
  );
}
