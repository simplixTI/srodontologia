'use client';

import { useState, useTransition } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  convertLeadToDentistAction,
  archiveLeadAction
} from '@/features/leads/actions';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export function LeadActions({ leadId }: { leadId: string }) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  const doConvert = async () => {
    const ok = await confirm({
      title: 'Converter em dentista?',
      description:
        'Um novo cadastro de dentista será criado com os dados deste lead. A conversão é registrada no histórico.',
      confirmLabel: 'Converter'
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await convertLeadToDentistAction(leadId);
      } catch (e) {
        if ((e as Error).message.includes('NEXT_REDIRECT')) throw e;
        toast.error('Falha ao converter', { description: (e as Error).message });
      }
    });
  };

  const doArchive = async () => {
    const ok = await confirm({
      title: 'Arquivar lead?',
      description: 'Ele não aparecerá mais no pipeline, mas seus dados serão preservados.',
      confirmLabel: 'Arquivar',
      tone: 'danger'
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await archiveLeadAction(leadId);
      } catch (e) {
        if ((e as Error).message.includes('NEXT_REDIRECT')) throw e;
        toast.error('Falha ao arquivar', { description: (e as Error).message });
      }
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        disabled={pending}
        onClick={doConvert}
        className="btn-gold inline-flex h-10 items-center gap-2 rounded-full px-5 text-[0.65rem] uppercase tracking-[0.25em] disabled:opacity-60"
      >
        <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />
        Converter em dentista
      </button>
      <button
        disabled={pending}
        onClick={doArchive}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-rose-400/30 px-5 text-[0.6rem] uppercase tracking-[0.28em] text-rose-200 transition hover:bg-rose-400/10 disabled:opacity-60"
      >
        <Trash2 className="h-3 w-3" strokeWidth={1.5} />
        Arquivar
      </button>
    </div>
  );
}
