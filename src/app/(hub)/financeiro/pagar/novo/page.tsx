import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { listCategories, listCostCenters } from '@/features/finance-v2/queries';
import { PayableCreateForm } from './PayableCreateForm';

export const metadata: Metadata = { title: 'Nova conta a pagar · SR HUB' };
export const dynamic = 'force-dynamic';

export default async function NovaContaPage() {
  const [categories, costCenters] = await Promise.all([
    listCategories('expense'),
    listCostCenters()
  ]);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/financeiro/pagar"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>
      <header>
        <h1 className="font-display text-3xl text-white md:text-4xl">Nova conta a pagar</h1>
      </header>
      <PayableCreateForm categories={categories} costCenters={costCenters} />
    </div>
  );
}
