'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { requestDataExportAction, requestDataDeletionAction } from '@/features/lgpd/actions';
import type { ExportRequestRow, DeletionRequestRow } from '@/features/lgpd/queries';

export function LgpdPanel({
  exports,
  deletions
}: {
  exports: ExportRequestRow[];
  deletions: DeletionRequestRow[];
}) {
  const [pending, start] = useTransition();

  const requestExport = () => {
    start(async () => {
      const res = await requestDataExportAction({ scope: 'organization' });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha.');
        return;
      }
      toast.success('Exportação solicitada. Você será avisado quando estiver pronta.');
    });
  };

  const requestDeletion = () => {
    if (!confirm('Solicitar exclusão de todos os dados da organização? A ação será executada em 30 dias e pode ser cancelada nesse período.')) return;
    start(async () => {
      const res = await requestDataDeletionAction({ scope: 'organization' });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha.');
        return;
      }
      toast.success('Solicitação registrada.');
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-gold/15 bg-white/[0.02] p-5">
        <h2 className="text-sm text-white">Exportar meus dados</h2>
        <p className="mt-1 text-xs text-white/60">
          Você receberá um arquivo ZIP com todos os dados de casos, mensagens, arquivos e usuários da organização.
        </p>
        <button
          type="button"
          onClick={requestExport}
          disabled={pending}
          className="mt-3 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 disabled:opacity-50"
        >
          {pending ? 'Solicitando…' : 'Solicitar exportação'}
        </button>

        {exports.length > 0 && (
          <ul className="mt-4 space-y-1 text-xs">
            {exports.slice(0, 5).map((e) => (
              <li key={e.id} className="text-white/60">
                {new Date(e.requested_at).toLocaleString('pt-BR')} · {e.status}
                {e.file_size ? ` · ${(e.file_size / 1024 / 1024).toFixed(1)} MB` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-red-400/20 bg-red-400/[0.03] p-5">
        <h2 className="text-sm text-red-100">Excluir todos os dados</h2>
        <p className="mt-1 text-xs text-red-100/70">
          Solicitação irreversível após execução. Aguarda 30 dias antes de rodar. Todos os usuários, casos,
          arquivos e histórico da organização serão removidos permanentemente.
        </p>
        <button
          type="button"
          onClick={requestDeletion}
          disabled={pending}
          className="mt-3 rounded-full border border-red-400/40 bg-red-400/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-red-100 hover:border-red-400/70 disabled:opacity-50"
        >
          {pending ? 'Solicitando…' : 'Solicitar exclusão'}
        </button>

        {deletions.length > 0 && (
          <ul className="mt-4 space-y-1 text-xs">
            {deletions.slice(0, 5).map((d) => (
              <li key={d.id} className="text-red-100/70">
                {new Date(d.requested_at).toLocaleString('pt-BR')} · {d.status}
                {d.scheduled_at && ` · execução em ${new Date(d.scheduled_at).toLocaleDateString('pt-BR')}`}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
