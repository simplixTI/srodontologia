'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { FileText, ImageIcon, Star, Tag as TagIcon } from 'lucide-react';
import { toast } from 'sonner';
import { toggleFavoriteAction } from '@/features/dam/actions';
import type { FileTag, FileWithMeta } from '@/features/dam/types';

type Props = { initialFiles: FileWithMeta[]; tags: FileTag[] };

export function FilesGrid({ initialFiles, tags }: Props) {
  const [files, setFiles] = useState<FileWithMeta[]>(initialFiles);
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return files.filter((f) => {
      if (selectedTag && !(f.tags ?? []).includes(selectedTag)) return false;
      if (q) {
        const hay = (f.file_name + ' ' + (f.case_title ?? '') + ' ' + (f.case_number ?? '')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [files, query, selectedTag]);

  function toggleFav(fileId: string) {
    const before = files.find((f) => f.id === fileId)?.is_favorite ?? false;
    setFiles((s) => s.map((f) => (f.id === fileId ? { ...f, is_favorite: !before } : f)));
    startTransition(async () => {
      try {
        await toggleFavoriteAction(fileId);
      } catch (e) {
        setFiles((s) => s.map((f) => (f.id === fileId ? { ...f, is_favorite: before } : f)));
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou caso"
          className="input-dark h-9 flex-1 rounded-full px-4 text-sm md:max-w-md"
        />
        <select
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
          className="input-dark h-9 rounded-full px-4 text-xs"
        >
          <option value="">Todas as tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
        <div className="ml-auto text-xs text-white/40">
          {filtered.length} / {files.length} arquivos
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 p-14 text-center text-sm text-white/40">
          Nenhum arquivo encontrado.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((f) => {
            const isImage = (f.mime_type ?? '').startsWith('image/');
            return (
              <li
                key={f.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-gold/10 bg-white/[0.02] hover:border-gold/30"
              >
                <button
                  type="button"
                  onClick={() => toggleFav(f.id)}
                  aria-label="Favoritar"
                  className={
                    'absolute right-2 top-2 z-10 rounded-full p-1.5 transition ' +
                    (f.is_favorite
                      ? 'bg-gold/30 text-gold-100'
                      : 'bg-black/40 text-white/40 hover:text-gold-100')
                  }
                >
                  <Star
                    className="h-3.5 w-3.5"
                    strokeWidth={1.5}
                    fill={f.is_favorite ? 'currentColor' : 'none'}
                  />
                </button>
                <Link href={`/casos/${f.case_id}`} className="block">
                  <div className="flex aspect-square items-center justify-center bg-black/40 text-white/30">
                    {isImage ? (
                      <ImageIcon className="h-10 w-10" strokeWidth={1.5} />
                    ) : (
                      <FileText className="h-10 w-10" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="p-3">
                    <div className="truncate text-xs text-white">{f.file_name}</div>
                    {f.case_number && (
                      <div className="mt-0.5 text-[0.6rem] text-white/50">{f.case_number}</div>
                    )}
                    {f.tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {f.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full border border-gold/10 bg-black/40 px-1.5 py-0.5 text-[0.5rem] text-white/70"
                          >
                            <TagIcon className="h-2 w-2" strokeWidth={1.5} />
                            {tag}
                          </span>
                        ))}
                        {f.tags.length > 3 && (
                          <span className="text-[0.5rem] text-white/40">+{f.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
