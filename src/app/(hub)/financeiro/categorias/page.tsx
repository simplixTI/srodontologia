import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { listCategories } from '@/features/finance-v2/queries';
import { CategoriesPanel } from './CategoriesPanel';

export const metadata: Metadata = { title: 'Categorias · Financeiro' };
export const dynamic = 'force-dynamic';

export default async function CategoriasPage() {
  const categories = await listCategories();
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/financeiro"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>
      <header>
        <h1 className="font-display text-3xl text-white md:text-4xl">Categorias financeiras</h1>
        <p className="mt-2 text-sm text-white/60">
          Categorias de receita e despesa alimentam o DRE e o dashboard.
        </p>
      </header>
      <CategoriesPanel initialCategories={categories} />
    </div>
  );
}
