import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { listCaseTypesWithCounts } from '@/features/checklists/queries';

export const metadata: Metadata = { title: 'Checklists · SR HUB' };
export const dynamic = 'force-dynamic';

export default async function ChecklistsPage() {
  const items = await listCaseTypesWithCounts();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Checklists · Case Engine
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>

        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
              Tipos de caso &amp; <span className="gold-text italic">checklists</span>
            </h1>
            <p className="mt-3 max-w-2xl text-white/60">
              Configure aqui as informações obrigatórias para cada tipo de trabalho.
              O dentista receberá exatamente esta lista ao enviar um novo caso —
              nenhum caso segue para produção com item obrigatório pendente.
            </p>
          </div>

          <Link
            href="/checklists/new"
            className="btn-gold group inline-flex h-12 items-center gap-2 rounded-full px-6 text-[0.72rem] uppercase tracking-[0.22em]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Novo tipo de caso
          </Link>
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => (
            <CaseTypeCard key={it.id} item={it} />
          ))}
        </section>
      )}
    </div>
  );
}

type CardItem = Awaited<ReturnType<typeof listCaseTypesWithCounts>>[number];

function CaseTypeCard({ item }: { item: CardItem }) {
  const progress =
    item.total_items === 0 ? 0 : Math.round((item.required_items / item.total_items) * 100);

  return (
    <Link
      href={`/checklists/${item.id}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.04] to-transparent p-7 card-hover"
    >
      {/* Active pill */}
      <div className="flex items-center justify-between">
        <span
          className={
            item.active
              ? 'inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.3em] text-emerald-200'
              : 'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.3em] text-white/40'
          }
        >
          <span
            className={item.active ? 'h-1 w-1 rounded-full bg-emerald-400' : 'h-1 w-1 rounded-full bg-white/30'}
          />
          {item.active ? 'Ativo' : 'Inativo'}
        </span>
        <span className="font-mono text-[0.6rem] tracking-widest text-white/30">
          #{item.sort_order.toString().padStart(3, '0')}
        </span>
      </div>

      <h3 className="mt-6 font-display text-2xl leading-tight text-white">
        {item.name}
      </h3>
      {item.description && (
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          {item.description}
        </p>
      )}

      <div className="mt-auto pt-8">
        <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.3em] text-white/50">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
            {item.required_items} obrigatórios
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Circle className="h-3 w-3 text-white/40" strokeWidth={1.5} />
            {item.total_items} totais
          </span>
        </div>

        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full bg-gold-gradient transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <code className="rounded-md bg-white/[0.03] px-2 py-1 font-mono text-[0.6rem] tracking-wider text-white/60">
            {item.code}
          </code>
          <span className="inline-flex items-center gap-1 text-[0.65rem] uppercase tracking-[0.3em] text-gold-100 transition group-hover:gap-2">
            Editar
            <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-gold/10 bg-white/[0.02] p-14 text-center">
      <h2 className="font-display text-2xl text-white">
        Nenhum tipo de caso ainda
      </h2>
      <p className="mt-3 text-sm text-white/60">
        Crie o primeiro tipo (ex.: Protocolo sobre Implante) e defina o checklist
        de arquivos e informações obrigatórias.
      </p>
      <Link
        href="/checklists/new"
        className="btn-gold mt-8 inline-flex h-11 items-center gap-2 rounded-full px-6 text-[0.7rem] uppercase tracking-[0.22em]"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Criar tipo de caso
      </Link>
    </div>
  );
}
