'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { promoteToProductionAction, transitionVersionAction } from '@/features/planning/actions';
import type { PlanningVersion } from '@/features/planning/types';

type Props = {
  version: PlanningVersion;
  requiredPending: number;
  alreadyPromoted: boolean;
};

export function VersionActions({ version, requiredPending, alreadyPromoted }: Props) {
  const router = useRouter();
  const [comment, setComment] = useState('');
  const [pending, startTransition] = useTransition();

  function transition(target: 'sent' | 'approved' | 'changes_requested' | 'obsolete') {
    startTransition(async () => {
      try {
        await transitionVersionAction({
          version_id: version.id,
          target,
          comment: comment || null
        });
        setComment('');
        toast.success('Status atualizado');
        router.refresh();
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  function promote() {
    startTransition(async () => {
      try {
        const res = await promoteToProductionAction(version.id);
        toast.success('Enviado para produção', {
          description: 'Cartão criado no Kanban',
          action: {
            label: 'Ver cartão',
            onClick: () => router.push(`/producao/${res.card_id}`)
          }
        });
        router.refresh();
      } catch (e) {
        toast.error('Falha ao promover', { description: (e as Error).message });
      }
    });
  }

  const canSend = version.status === 'draft' || version.status === 'changes_requested';
  const canApprove = version.status === 'sent';
  const canRequestChanges = version.status === 'sent';
  const canPromote = version.status === 'approved' && !alreadyPromoted;

  return (
    <section className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
      <h2 className="mb-3 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">Ações</h2>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comentário (opcional)"
        rows={2}
        className="input-dark mb-3 w-full rounded-xl px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || !canSend}
          onClick={() => transition('sent')}
          className="btn-outline-gold h-10 rounded-full px-5 text-[0.65rem] uppercase tracking-[0.22em] disabled:opacity-30"
        >
          Enviar ao dentista
        </button>
        <button
          type="button"
          disabled={pending || !canApprove}
          onClick={() => transition('approved')}
          className="btn-gold h-10 rounded-full px-5 text-[0.65rem] uppercase tracking-[0.22em] disabled:opacity-30"
        >
          Aprovar
        </button>
        <button
          type="button"
          disabled={pending || !canRequestChanges}
          onClick={() => transition('changes_requested')}
          className="h-10 rounded-full border border-amber-400/40 bg-amber-400/10 px-5 text-[0.65rem] uppercase tracking-[0.22em] text-amber-200 disabled:opacity-30"
        >
          Solicitar ajuste
        </button>
        <button
          type="button"
          disabled={pending || !canPromote}
          onClick={promote}
          className="ml-auto h-10 rounded-full border border-emerald-400/50 bg-emerald-400/10 px-5 text-[0.65rem] uppercase tracking-[0.22em] text-emerald-200 disabled:opacity-30"
          title={
            requiredPending > 0
              ? `${requiredPending} item(s) obrigatório(s) do checklist pendente(s)`
              : 'Cria cartão de produção'
          }
        >
          Enviar para produção
          {requiredPending > 0 && ` · ${requiredPending} pendente(s)`}
        </button>
      </div>
    </section>
  );
}
