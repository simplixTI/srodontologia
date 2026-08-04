'use client';

import { useState, useTransition } from 'react';
import { Send, AlertTriangle } from 'lucide-react';
import { submitCaseAction } from '@/features/cases/actions';

function band(score: number) {
  if (score >= 90) return { label: 'Excelente', tone: 'emerald', hint: 'Pronto para enviar.' };
  if (score >= 70) return { label: 'Bom', tone: 'teal', hint: 'Existem pequenos pontos pendentes.' };
  if (score >= 50) return { label: 'Incompleto', tone: 'amber', hint: 'Faltam informações importantes.' };
  return { label: 'Crítico', tone: 'rose', hint: 'Caso muito incompleto para enviar.' };
}

const tones = {
  emerald: 'border-emerald-400/30 bg-emerald-400/5 text-emerald-200',
  teal:    'border-teal-400/30 bg-teal-400/5 text-teal-200',
  amber:   'border-amber-400/30 bg-amber-400/5 text-amber-200',
  rose:    'border-rose-400/30 bg-rose-400/5 text-rose-200'
} as const;

export function HealthScore({
  score,
  missing,
  totalRequired,
  canSubmit,
  caseId
}: {
  score: number;
  missing: number;
  totalRequired: number;
  canSubmit: boolean;
  caseId: string;
}) {
  const b = band(score);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const doSubmit = () => {
    if (!confirm('Enviar caso para análise? Após enviado, o rascunho não pode mais ser editado livremente.')) return;
    setError(null);
    startTransition(async () => {
      try {
        await submitCaseAction(caseId);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <section className={`rounded-3xl border ${tones[b.tone as keyof typeof tones]} p-6`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-5">
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray={`${score} 100`}
                strokeLinecap="round"
                pathLength={100}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl leading-none text-white">{score}</span>
              <span className="text-[0.5rem] uppercase tracking-[0.3em] text-white/50">%</span>
            </div>
          </div>

          <div>
            <div className="text-[0.55rem] uppercase tracking-[0.32em] opacity-70">
              Case Health Score
            </div>
            <div className="mt-1 font-display text-2xl text-white">
              Caso {b.label.toLowerCase()}
            </div>
            <p className="mt-1 text-sm text-white/60">{b.hint}</p>
            {totalRequired > 0 && (
              <p className="mt-1 text-xs text-white/50">
                {totalRequired - missing} de {totalRequired} itens obrigatórios concluídos.
                {missing > 0 && <> Faltam <strong className="text-white">{missing}</strong>.</>}
              </p>
            )}
          </div>
        </div>

        {canSubmit && (
          <div className="flex flex-col items-end gap-2">
            <button
              disabled={pending || missing > 0}
              onClick={doSubmit}
              className={
                missing > 0
                  ? 'inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-6 text-[0.7rem] uppercase tracking-[0.24em] text-white/40 cursor-not-allowed'
                  : 'btn-gold inline-flex h-11 items-center gap-2 rounded-full px-6 text-[0.72rem] uppercase tracking-[0.22em] disabled:opacity-60'
              }
              title={missing > 0 ? 'Complete os itens obrigatórios primeiro' : 'Enviar para análise interna'}
            >
              <Send className="h-3.5 w-3.5" strokeWidth={2} />
              {pending ? 'Enviando...' : 'Enviar para análise'}
            </button>
            {missing > 0 && (
              <div className="flex items-center gap-1.5 text-[0.6rem] text-rose-200/90">
                <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />
                {missing} obrigatóri{missing === 1 ? 'o' : 'os'} pendente{missing !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}
    </section>
  );
}
