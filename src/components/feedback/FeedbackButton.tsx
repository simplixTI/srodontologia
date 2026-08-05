'use client';

import { useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { submitFeedbackAction } from '@/features/feedback/actions';

const KINDS: { value: string; label: string }[] = [
  { value: 'bug', label: 'Erro' },
  { value: 'suggestion', label: 'Sugestão' },
  { value: 'friction', label: 'Dificuldade' },
  { value: 'question', label: 'Dúvida' },
  { value: 'performance', label: 'Desempenho' }
];

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('suggestion');
  const [comment, setComment] = useState('');
  const [pending, start] = useTransition();
  const pathname = usePathname();

  const submit = () => {
    start(async () => {
      const res = await submitFeedbackAction({ kind, comment, route: pathname });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha.');
        return;
      }
      toast.success('Obrigado pelo feedback!');
      setComment('');
      setOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 bg-black/80 text-gold-100 shadow-lg backdrop-blur hover:border-gold/70 lg:right-8"
        aria-label="Enviar feedback"
      >
        <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
      </button>

      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-80 rounded-2xl border border-gold/25 bg-black/95 p-4 shadow-2xl backdrop-blur lg:right-8">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[0.55rem] uppercase tracking-[0.28em] text-gold-100">Feedback</div>
              <div className="mt-1 text-sm text-white">Como podemos melhorar?</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-white/15 p-1 text-white/60 hover:border-white/30 hover:text-white"
            >
              <X className="h-3 w-3" strokeWidth={1.5} />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1">
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => setKind(k.value)}
                className={
                  kind === k.value
                    ? 'rounded-full border border-gold/50 bg-gold/15 px-2 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100'
                    : 'rounded-full border border-white/15 px-2 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-white/60'
                }
              >
                {k.label}
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Conte o que aconteceu ou o que gostaria..."
            rows={3}
            maxLength={2000}
            className="mt-3 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none"
          />

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={submit}
              disabled={pending || comment.trim().length < 3}
              className="rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 disabled:opacity-50"
            >
              {pending ? 'Enviando…' : 'Enviar'}
            </button>
          </div>

          <p className="mt-2 text-[0.5rem] uppercase tracking-[0.28em] text-white/30">
            Rota atual: {pathname}
          </p>
        </div>
      )}
    </>
  );
}
