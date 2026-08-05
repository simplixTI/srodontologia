import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { listStages } from '@/features/production/queries';
import { StageManager } from './StageManager';

export const metadata: Metadata = { title: 'Configurar etapas · Produção' };
export const dynamic = 'force-dynamic';

export default async function ConfigurarEtapasPage() {
  const stages = await listStages();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/producao"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar ao Kanban
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Produção · Configuração
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>
        <h1 className="font-display text-3xl text-white md:text-4xl">Etapas do fluxo</h1>
        <p className="text-sm text-white/60">
          Configure as etapas do Kanban de produção. Cada organização pode ter seu próprio fluxo.
          Etapas com cartões ativos não podem ser excluídas.
        </p>
      </header>

      <StageManager initialStages={stages} />
    </div>
  );
}
