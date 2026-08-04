'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { Send, Eye, EyeOff, Loader2 } from 'lucide-react';
import type { CaseMessage } from '@/features/messages/queries';
import { sendCaseMessageAction } from '@/features/messages/actions';
import { ROLE_LABELS } from '@/lib/permissions/roles';
import type { UserRole } from '@/types/database';

export function MessagesTab({
  caseId,
  initialMessages
}: {
  caseId: string;
  initialMessages: CaseMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [visibility, setVisibility] = useState<'dentist' | 'internal'>('dentist');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  const submit = () => {
    const message = textareaRef.current?.value?.trim() ?? '';
    if (!message) return;

    // Optimistic
    const optimistic: CaseMessage = {
      id: 'temp-' + Date.now(),
      case_id: caseId,
      sender_id: 'me',
      message,
      visibility,
      reply_to_id: null,
      edited_at: null,
      created_at: new Date().toISOString(),
      sender: null
    };
    setMessages((prev) => [...prev, optimistic]);
    if (textareaRef.current) textareaRef.current.value = '';
    setError(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.append('message', message);
      fd.append('visibility', visibility);
      const result = await sendCaseMessageAction(caseId, fd);
      if (!result.ok) {
        setError(result.error ?? 'Erro ao enviar.');
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        if (textareaRef.current) textareaRef.current.value = message;
      } else {
        // Full reload to hydrate the actual message + sender info
        window.location.reload();
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl text-white">Mensagens</h3>
          <p className="mt-1 text-xs text-white/50">
            Mensagens marcadas como <strong className="text-gold-100">Dentista</strong> aparecem no portal.
            Notas <strong className="text-white/70">Internas</strong> nunca vazam.
          </p>
        </div>
      </div>

      <div
        ref={listRef}
        className="max-h-[500px] overflow-y-auto rounded-2xl border border-gold/10 bg-black/40 p-4"
      >
        {messages.length === 0 ? (
          <p className="text-center text-sm text-white/40">
            Nenhuma mensagem ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((m) => (
              <li
                key={m.id}
                className={
                  'flex flex-col rounded-2xl p-3 ' +
                  (m.visibility === 'internal'
                    ? 'border border-white/10 bg-white/[0.02]'
                    : 'border border-gold/20 bg-gold/[0.05]')
                }
              >
                <div className="mb-1 flex items-center justify-between gap-2 text-[0.55rem] uppercase tracking-[0.28em]">
                  <span className="text-white/70">
                    {m.sender?.full_name ?? 'Você'}
                    {m.sender?.role && (
                      <span className="ml-2 text-white/40">· {ROLE_LABELS[m.sender.role as UserRole] ?? m.sender.role}</span>
                    )}
                  </span>
                  <span
                    className={
                      m.visibility === 'internal'
                        ? 'inline-flex items-center gap-1 text-white/50'
                        : 'inline-flex items-center gap-1 text-gold-100'
                    }
                  >
                    {m.visibility === 'internal' ? (
                      <><EyeOff className="h-2.5 w-2.5" strokeWidth={1.5} /> interna</>
                    ) : (
                      <><Eye className="h-2.5 w-2.5" strokeWidth={1.5} /> dentista</>
                    )}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-white">{m.message}</p>
                <div className="mt-2 text-[0.55rem] text-white/35">
                  {new Date(m.created_at).toLocaleString('pt-BR')}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Composer */}
      <div className="rounded-2xl border border-gold/10 bg-white/[0.02] p-3">
        <textarea
          ref={textareaRef}
          placeholder={visibility === 'internal' ? 'Nota interna (não visível ao dentista)...' : 'Mensagem para o dentista...'}
          rows={3}
          disabled={pending}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          className="w-full resize-none rounded-xl border border-gold/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-gold/50 focus:outline-none"
        />
        {error && (
          <p className="mt-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1">
            <button
              onClick={() => setVisibility('dentist')}
              className={
                'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[0.55rem] uppercase tracking-[0.25em] transition ' +
                (visibility === 'dentist'
                  ? 'bg-gold-gradient text-black font-medium'
                  : 'text-white/60 hover:text-white')
              }
            >
              <Eye className="h-2.5 w-2.5" strokeWidth={1.5} /> Dentista
            </button>
            <button
              onClick={() => setVisibility('internal')}
              className={
                'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[0.55rem] uppercase tracking-[0.25em] transition ' +
                (visibility === 'internal'
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/60 hover:text-white')
              }
            >
              <EyeOff className="h-2.5 w-2.5" strokeWidth={1.5} /> Interna
            </button>
          </div>

          <button
            onClick={submit}
            disabled={pending}
            className="btn-gold inline-flex h-9 items-center gap-2 rounded-full px-4 text-[0.65rem] uppercase tracking-[0.22em] disabled:opacity-60"
          >
            {pending ? (
              <><Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} /> Enviando</>
            ) : (
              <><Send className="h-3 w-3" strokeWidth={1.5} /> Enviar (⌘↵)</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
