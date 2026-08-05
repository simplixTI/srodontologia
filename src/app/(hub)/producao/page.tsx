import type { Metadata } from 'next';
import Link from 'next/link';
import { Cog, Settings2, Sparkles } from 'lucide-react';
import { listActiveStages, listCards, listStageMetrics } from '@/features/production/queries';
import { ProductionKanban } from './ProductionKanban';

export const metadata: Metadata = { title: 'Produção · SR HUB' };
export const dynamic = 'force-dynamic';

export default async function ProducaoPage() {
  const [stages, cards, metrics] = await Promise.all([
    listActiveStages(),
    listCards(),
    listStageMetrics()
  ]);

  const totalActive = cards.length;
  const totalOverdue = metrics.reduce((acc, m) => acc + Number(m.overdue_cards ?? 0), 0);

  return (
    <div className="mx-auto flex max-w-[100rem] flex-col gap-10 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Fluxo · Produção
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>

        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
              Produção — Kanban do laboratório
            </h1>
            <p className="mt-3 max-w-2xl text-white/60">
              Cartões por etapa. Total ativo: <strong className="text-white">{totalActive}</strong>{' '}
              {totalActive === 1 ? 'cartão' : 'cartões'}
              {totalOverdue > 0 && (
                <>
                  {' · '}
                  <strong className="text-red-300">{totalOverdue} atrasados</strong>
                </>
              )}
              .
            </p>
            <p className="mt-1 text-xs text-white/40">
              Arraste os cartões entre etapas para avançar o fluxo — SLA e tempos são atualizados
              automaticamente.
            </p>
          </div>

          <Link
            href="/producao/configurar"
            className="btn-outline-gold group inline-flex h-11 items-center gap-2 rounded-full px-5 text-[0.68rem] uppercase tracking-[0.22em]"
          >
            <Settings2 className="h-4 w-4" strokeWidth={1.5} /> Configurar etapas
          </Link>
        </div>
      </header>

      {stages.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-gold/10 bg-white/[0.02] p-14 text-center">
          <Sparkles className="h-6 w-6 text-gold-300" strokeWidth={1.5} />
          <h2 className="mt-4 font-display text-2xl text-white">Sem etapas configuradas</h2>
          <p className="mt-3 text-sm text-white/60">
            Crie as etapas do fluxo de produção para começar a receber cartões.
          </p>
          <Link
            href="/producao/configurar"
            className="btn-gold mt-8 inline-flex h-11 items-center gap-2 rounded-full px-6 text-[0.7rem] uppercase tracking-[0.22em]"
          >
            <Settings2 className="h-4 w-4" strokeWidth={2} /> Configurar
          </Link>
        </div>
      ) : cards.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-gold/10 bg-white/[0.02] p-14 text-center">
          <Cog className="h-6 w-6 text-gold-300" strokeWidth={1.5} />
          <h2 className="mt-4 font-display text-2xl text-white">Nenhum cartão em produção</h2>
          <p className="mt-3 text-sm text-white/60">
            Envie um caso para a produção a partir da tela do caso.
          </p>
          <Link
            href="/casos"
            className="btn-gold mt-8 inline-flex h-11 items-center gap-2 rounded-full px-6 text-[0.7rem] uppercase tracking-[0.22em]"
          >
            Ir para Casos
          </Link>
        </div>
      ) : (
        <ProductionKanban initialCards={cards} stages={stages} />
      )}
    </div>
  );
}
