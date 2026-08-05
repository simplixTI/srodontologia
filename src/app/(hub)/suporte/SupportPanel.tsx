'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { openSupportTicketAction } from '@/features/support/actions';

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  resolved_at: string | null;
};

export function SupportPanel({ initial }: { initial: Ticket[] }) {
  const [tickets, setTickets] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [pending, start] = useTransition();

  const open = () => {
    start(async () => {
      const res = await openSupportTicketAction({ subject, description, priority });
      if (!res.ok || !res.id) {
        toast.error(res.error ?? 'Falha.');
        return;
      }
      toast.success('Ticket aberto.');
      setTickets((t) => [
        {
          id: res.id!,
          subject,
          status: 'open',
          priority,
          created_at: new Date().toISOString(),
          resolved_at: null
        },
        ...t
      ]);
      setSubject('');
      setDescription('');
      setPriority('medium');
      setCreating(false);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70"
        >
          Abrir ticket
        </button>
      </div>

      {creating && (
        <div className="rounded-2xl border border-gold/25 bg-gold/[0.03] p-4">
          <div className="flex flex-col gap-3">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto"
              className="h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o problema com o máximo de detalhes…"
              rows={4}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
              className="h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-full border border-white/15 px-4 py-1.5 text-[0.55rem] uppercase tracking-[0.28em] text-white/70"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={open}
              disabled={pending || !subject.trim()}
              className="rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 disabled:opacity-50"
            >
              {pending ? 'Enviando…' : 'Abrir'}
            </button>
          </div>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {tickets.map((t) => (
          <li key={t.id} className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-white">{t.subject}</div>
                <div className="mt-1 text-[0.55rem] uppercase tracking-[0.28em] text-white/40">
                  {new Date(t.created_at).toLocaleString('pt-BR')}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="rounded-full border border-white/15 bg-white/[0.05] px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.28em] text-white/70">
                  {t.status}
                </span>
                <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100">
                  {t.priority}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
