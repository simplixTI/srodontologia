'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cancelEventAction, deleteEventAction } from '@/features/calendar/actions';

export function EventActions({ eventId, cancelled }: { eventId: string; cancelled: boolean }) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();

  function cancel() {
    startTransition(async () => {
      try {
        await cancelEventAction(eventId, reason || null);
        toast.success('Evento cancelado');
        router.refresh();
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  function remove() {
    if (!confirm('Remover evento permanentemente?')) return;
    startTransition(async () => {
      try {
        await deleteEventAction(eventId);
        toast.success('Removido');
        router.push('/agenda');
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  return (
    <section className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
      <h2 className="mb-3 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">Ações</h2>
      {cancelled ? (
        <div className="text-sm text-red-200">
          Este evento foi cancelado.
          <button
            type="button"
            onClick={remove}
            className="ml-4 h-8 rounded-full border border-red-400/40 px-3 text-[0.55rem] uppercase tracking-[0.22em] text-red-300 hover:bg-red-400/10"
          >
            Excluir permanentemente
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo do cancelamento (opcional)"
            className="input-dark h-9 rounded-xl px-3 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="h-10 rounded-full border border-amber-400/40 bg-amber-400/10 px-5 text-[0.65rem] uppercase tracking-[0.22em] text-amber-200 hover:bg-amber-400/20"
            >
              Cancelar evento
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="h-10 rounded-full border border-red-400/40 px-5 text-[0.65rem] uppercase tracking-[0.22em] text-red-300 hover:bg-red-400/10"
            >
              Excluir
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
