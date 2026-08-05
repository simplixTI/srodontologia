'use client';

import { useState, useTransition } from 'react';
import { askLabAssistantAction } from '@/features/ai/actions';

type Turn = { role: 'user' | 'assistant'; text: string; degraded?: boolean };

const SUGGESTIONS = [
  'Quais casos estão atrasados?',
  'Qual cliente mais faturou este mês?',
  'Quais são os tipos de trabalho mais recorrentes?',
  'Quantos casos temos ativos agora?'
];

export function LabAssistantChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [pending, start] = useTransition();

  const ask = (q: string) => {
    if (!q.trim()) return;
    const question = q.trim();
    setInput('');
    setTurns((t) => [...t, { role: 'user', text: question }]);
    start(async () => {
      const res = await askLabAssistantAction(question);
      if (!res.ok) {
        setTurns((t) => [...t, { role: 'assistant', text: `Erro: ${res.error}` }]);
        return;
      }
      setTurns((t) => [...t, { role: 'assistant', text: res.text, degraded: res.degraded }]);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {turns.length === 0 && (
        <div className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
          <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">Sugestões</div>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {SUGGESTIONS.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => ask(s)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-left text-sm text-white/80 hover:border-gold/40 hover:text-white"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {turns.map((t, i) => (
          <li key={i}>
            <div
              className={
                t.role === 'user'
                  ? 'ml-auto max-w-[85%] rounded-2xl border border-gold/25 bg-gold/[0.05] p-3 text-sm text-white'
                  : 'mr-auto max-w-[85%] rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-sm text-white/85'
              }
            >
              {t.role === 'assistant' && t.degraded && (
                <div className="mb-1 text-[0.5rem] uppercase tracking-[0.28em] text-yellow-300">
                  Resposta em modo degradado
                </div>
              )}
              <div className="whitespace-pre-wrap">{t.text}</div>
            </div>
          </li>
        ))}
        {pending && (
          <li className="mr-auto max-w-[85%] rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/50">
            Pensando…
          </li>
        )}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte alguma coisa…"
          className="h-10 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none"
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending || input.trim().length < 2}
          className="rounded-full border border-gold/40 bg-gold/10 px-5 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 hover:bg-gold/20 disabled:opacity-50"
        >
          {pending ? 'Enviando…' : 'Perguntar'}
        </button>
      </form>
    </div>
  );
}
