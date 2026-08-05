import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Star, FileText, ImageIcon } from 'lucide-react';
import { listFavorites } from '@/features/dam/queries';

export const metadata: Metadata = { title: 'Favoritos · Arquivos' };
export const dynamic = 'force-dynamic';

export default async function FavoritosPage() {
  const files = await listFavorites();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/arquivos"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>
      <header>
        <h1 className="flex items-center gap-3 font-display text-3xl text-white md:text-4xl">
          <Star className="h-6 w-6 text-gold-200" strokeWidth={1.5} fill="currentColor" />
          Meus favoritos
        </h1>
      </header>

      {files.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 p-14 text-center text-sm text-white/40">
          Nenhum arquivo favoritado. Toque na estrela dos arquivos que você quer marcar.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {files.map((f) => {
            const isImage = (f.mime_type ?? '').startsWith('image/');
            return (
              <li key={f.id} className="rounded-2xl border border-gold/10 bg-white/[0.02] p-3">
                <Link href={`/casos/${f.case_id}`} className="block">
                  <div className="flex aspect-square items-center justify-center rounded-lg bg-black/40 text-white/30">
                    {isImage ? (
                      <ImageIcon className="h-10 w-10" strokeWidth={1.5} />
                    ) : (
                      <FileText className="h-10 w-10" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="mt-2 truncate text-xs text-white">{f.file_name}</div>
                  {f.case_number && (
                    <div className="text-[0.6rem] text-white/50">{f.case_number}</div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
