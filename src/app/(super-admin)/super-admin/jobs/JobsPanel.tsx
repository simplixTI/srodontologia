'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { reprocessJobAction, cancelJobAction } from '@/features/jobs/actions';

type JobRow = {
  id: string;
  kind: string;
  status: string;
  attempts: number;
  max_attempts: number;
  priority: number;
  error: string | null;
  created_at: string;
  completed_at: string | null;
  dead_lettered_at: string | null;
  organization: { name: string } | null;
};

const STATUSES: { key: string; label: string; tone: string }[] = [
  { key: 'all',         label: 'Todos',        tone: 'white/70' },
  { key: 'queued',      label: 'Na fila',      tone: 'white/70' },
  { key: 'running',     label: 'Rodando',      tone: 'gold-100' },
  { key: 'completed',   label: 'Concluídos',   tone: 'emerald-200' },
  { key: 'failed',      label: 'Falharam',     tone: 'orange-200' },
  { key: 'dead_letter', label: 'Dead-letter',  tone: 'red-200' },
  { key: 'cancelled',   label: 'Cancelados',   tone: 'white/50' }
];

export function JobsPanel({
  jobs,
  counts,
  currentStatus
}: {
  jobs: JobRow[];
  counts: Record<string, number>;
  currentStatus: string;
}) {
  const [pending, start] = useTransition();

  const reprocess = (id: string) => {
    start(async () => {
      const res = await reprocessJobAction(id);
      if (!res.ok) {
        toast.error(res.error ?? 'Falha.');
        return;
      }
      toast.success('Reenfileirado.');
    });
  };

  const cancel = (id: string) => {
    if (!confirm('Cancelar este job?')) return;
    start(async () => {
      const res = await cancelJobAction(id);
      if (!res.ok) {
        toast.error(res.error ?? 'Falha.');
        return;
      }
      toast.success('Cancelado.');
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s.key}
            href={`?status=${s.key}`}
            className={
              currentStatus === s.key
                ? 'rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100'
                : 'rounded-full border border-white/15 px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.28em] text-white/70 hover:border-white/30'
            }
          >
            {s.label} · {(counts[s.key] ?? counts[s.key === 'all' ? '' : ''] ?? 0).toLocaleString('pt-BR')}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gold/10 bg-white/[0.02]">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/40 text-[0.55rem] uppercase tracking-[0.28em] text-white/50">
            <tr>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tent.</th>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Criado</th>
              <th className="px-4 py-3">Erro</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-xs text-white/40">
                  Nenhum job.
                </td>
              </tr>
            )}
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-white/5 text-xs">
                <td className="px-4 py-2 font-mono text-white">{j.kind}</td>
                <td className="px-4 py-2">
                  <StatusPill status={j.status} />
                </td>
                <td className="px-4 py-2 text-white/60">
                  {j.attempts}/{j.max_attempts}
                </td>
                <td className="px-4 py-2 text-white/70">{j.organization?.name ?? '—'}</td>
                <td className="px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
                  {new Date(j.created_at).toLocaleString('pt-BR')}
                </td>
                <td className="px-4 py-2 text-red-200/70">{j.error ? j.error.slice(0, 60) : ''}</td>
                <td className="px-4 py-2 text-right">
                  <div className="inline-flex gap-1">
                    {(j.status === 'failed' || j.status === 'dead_letter') && (
                      <button
                        type="button"
                        onClick={() => reprocess(j.id)}
                        disabled={pending}
                        className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.28em] text-emerald-200 hover:border-emerald-400/70 disabled:opacity-50"
                      >
                        Reprocessar
                      </button>
                    )}
                    {(j.status === 'queued' || j.status === 'running') && (
                      <button
                        type="button"
                        onClick={() => cancel(j.id)}
                        disabled={pending}
                        className="rounded-full border border-red-400/40 bg-red-400/10 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.28em] text-red-200 hover:border-red-400/70 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tones: Record<string, string> = {
    queued: 'border-white/15 bg-white/[0.05] text-white/60',
    running: 'border-gold/40 bg-gold/10 text-gold-100',
    completed: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    failed: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
    dead_letter: 'border-red-400/30 bg-red-400/10 text-red-200',
    cancelled: 'border-white/15 bg-white/[0.05] text-white/40'
  };
  return (
    <span className={'rounded-full border px-2 py-0.5 ' + (tones[status] ?? tones.queued)}>{status}</span>
  );
}
