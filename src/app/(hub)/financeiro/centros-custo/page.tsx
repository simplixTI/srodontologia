import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { listCostCenters } from '@/features/finance-v2/queries';
import { CostCentersPanel } from './CostCentersPanel';

export const metadata: Metadata = { title: 'Centros de custo · Financeiro' };
export const dynamic = 'force-dynamic';

export default async function CentrosCustoPage() {
  const costCenters = await listCostCenters();
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/financeiro"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>
      <header>
        <h1 className="font-display text-3xl text-white md:text-4xl">Centros de custo</h1>
        <p className="mt-2 text-sm text-white/60">
          Agrupe despesas e receitas por área ou departamento.
        </p>
      </header>
      <CostCentersPanel initialItems={costCenters} />
    </div>
  );
}
