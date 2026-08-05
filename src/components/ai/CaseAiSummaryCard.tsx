'use client';

import { useState, useTransition } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { requestCaseSummaryAction } from '@/features/ai/actions';
import type { CaseAiSummary } from '@/features/ai/queries';

export function CaseAiSummaryCard({
  caseId,
  initial
}: {
  caseId: string;
  initial: CaseAiSummary | null;
}) {
  const [current] = useState<CaseAiSummary | null>(initial);
  const [pending, start] = useTransition();

  const refresh = () => {
    start(async () => {
      const res = await requestCaseSummaryAction(caseId);
      if (!res.ok) toast.error(res.error ?? 'Falha ao solicitar resumo.');
      else toast.success('Resumo em processamento. Recarregue em instantes.');
    });
  };

  return (
    <section className="rounded-3xl border border-gold/15 bg-gradient-to-b from-gold/[0.04] to-transparent p-5">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold-200" strokeWidth={1.5} />
          <h3 className="text-sm text-white">Resumo automático</h3>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-white/70 hover:border-gold/40 hover:text-gold-100 disabled:opacity-50"
        >
          <RefreshCw className={pending ? 'h-3 w-3 animate-spin' : 'h-3 w-3'} strokeWidth={1.5} />
          {pending ? 'Solicitando…' : current ? 'Regerar' : 'Gerar'}
        </button>
      </header>

      {current ? (
        <div className="mt-4 flex flex-col gap-3 text-sm text-white/85">
          <p className="whitespace-pre-wrap">{current.summary}</p>
          {(current.pending?.length ?? 0) > 0 && (
            <div>
              <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">Pendências</div>
              <ul className="mt-1 list-disc pl-5 text-xs text-white/70">
                {current.pending?.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {(current.next_steps?.length ?? 0) > 0 && (
            <div>
              <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">Próximos passos</div>
              <ul className="mt-1 list-disc pl-5 text-xs text-white/70">
                {current.next_steps?.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          <div className="text-[0.5rem] uppercase tracking-[0.28em] text-white/30">
            Modelo: {current.model ?? 'n/a'} · Gerado em {new Date(current.generated_at).toLocaleString('pt-BR')}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-xs text-white/50">
          Nenhum resumo automático ainda. Clique em <strong>Gerar</strong> — o assistente prepara um panorama
          do caso em segundos.
        </p>
      )}
    </section>
  );
}
