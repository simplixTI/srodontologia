import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileCog, Plus, Star } from 'lucide-react';
import { listChecklists } from '@/features/qc/queries';

export const metadata: Metadata = { title: 'Templates QC · SR HUB' };
export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const templates = await listChecklists();
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/qualidade"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>

      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl text-white md:text-4xl">Templates de QC</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Cada template define o checklist da inspeção. O padrão é usado quando não há template específico
            para o tipo de caso.
          </p>
        </div>
        <Link
          href="/qualidade/templates/novo"
          className="btn-gold inline-flex h-11 items-center gap-2 rounded-full px-5 text-[0.68rem] uppercase tracking-[0.22em]"
        >
          <Plus className="h-4 w-4" strokeWidth={2} /> Novo
        </Link>
      </header>

      {templates.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-gold/10 bg-white/[0.02] p-14 text-center">
          <FileCog className="h-6 w-6 text-gold-300" strokeWidth={1.5} />
          <h2 className="mt-4 font-display text-2xl text-white">Nenhum template</h2>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {templates.map((t) => (
            <li key={t.id} className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5 hover:border-gold/30">
              <Link href={`/qualidade/templates/${t.id}`} className="block">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-lg text-white">
                      {t.name}
                      {t.is_default && <Star className="h-3.5 w-3.5 text-gold-100" strokeWidth={1.5} fill="currentColor" />}
                    </div>
                    {t.description && <div className="mt-1 line-clamp-2 text-xs text-white/60">{t.description}</div>}
                  </div>
                  <span
                    className={
                      'shrink-0 rounded-full border px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.2em] ' +
                      (t.is_active
                        ? 'border-emerald-400/40 text-emerald-200'
                        : 'border-white/20 text-white/40')
                    }
                  >
                    {t.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
