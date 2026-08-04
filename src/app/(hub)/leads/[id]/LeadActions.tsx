'use client';

import { useState, useTransition } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import {
  convertLeadToDentistAction,
  archiveLeadAction
} from '@/features/leads/actions';

export function LeadActions({ leadId }: { leadId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const doConvert = () => {
    if (!confirm('Converter este lead em dentista? Um novo cadastro será criado.')) return;
    setError(null);
    startTransition(async () => {
      try {
        await convertLeadToDentistAction(leadId);
      } catch (e) {
        if ((e as Error).message.includes('NEXT_REDIRECT')) throw e;
        setError((e as Error).message);
      }
    });
  };

  const doArchive = () => {
    if (!confirm('Arquivar este lead? Não aparecerá mais no pipeline.')) return;
    setError(null);
    startTransition(async () => {
      try {
        await archiveLeadAction(leadId);
      } catch (e) {
        if ((e as Error).message.includes('NEXT_REDIRECT')) throw e;
        setError((e as Error).message);
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
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
      {error && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-xs text-rose-200">
          {error}
        </p>
      )}
    </div>
  );
}
