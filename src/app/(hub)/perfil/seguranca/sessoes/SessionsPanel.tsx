'use client';

import { useState, useTransition } from 'react';
import { LogOut, Smartphone, Monitor, Tablet, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { revokeSessionAction, revokeAllOtherSessionsAction } from '@/features/sessions/actions';
import type { SessionRow } from '@/features/sessions/queries';

export function SessionsPanel({ initial }: { initial: SessionRow[] }) {
  const [rows, setRows] = useState(initial);
  const [pending, start] = useTransition();

  const revokeOne = (id: string) => {
    if (!window.confirm('Revogar esta sessão? O dispositivo perderá acesso no próximo refresh.')) return;
    start(async () => {
      const res = await revokeSessionAction(id);
      if (!res.ok) {
        toast.error(res.error ?? 'Falha.');
        return;
      }
      setRows((r) => r.map((s) => (s.id === id ? { ...s, revoked_at: new Date().toISOString() } : s)));
      toast.success('Sessão revogada.');
    });
  };

  const revokeAll = () => {
    if (!window.confirm('Revogar TODAS as sessões (incluindo esta)? Você precisará fazer login novamente.')) return;
    start(async () => {
      const res = await revokeAllOtherSessionsAction();
      if (!res.ok) {
        toast.error(res.error ?? 'Falha.');
        return;
      }
      toast.success('Sessões revogadas.');
      window.location.href = '/login';
    });
  };

  const active = rows.filter((r) => !r.revoked_at);
  const revoked = rows.filter((r) => r.revoked_at);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm text-white">Sessões ativas ({active.length})</h2>
          {active.length > 1 && (
            <button
              type="button"
              onClick={revokeAll}
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-full border border-red-400/40 bg-red-400/10 px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.28em] text-red-200 hover:border-red-400/70 disabled:opacity-50"
            >
              <LogOut className="h-3 w-3" strokeWidth={1.5} />
              Encerrar todas
            </button>
          )}
        </div>
        {active.length === 0 && (
          <p className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center text-xs text-white/40">
            Nenhuma sessão registrada. Faça login em outro dispositivo para começar a ver aqui.
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {active.map((s) => (
            <li key={s.id} className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <DeviceIcon kind={s.device_kind ?? 'other'} />
                  <div>
                    <div className="text-sm text-white">
                      {s.browser ?? 'Navegador'} · {s.os ?? 'SO'}
                    </div>
                    <div className="mt-1 text-[0.6rem] uppercase tracking-[0.28em] text-white/50">
                      Último acesso {new Date(s.last_seen_at).toLocaleString('pt-BR')}
                    </div>
                    <div className="mt-0.5 text-[0.55rem] text-white/40">
                      Criada em {new Date(s.first_seen_at).toLocaleDateString('pt-BR')}
                      {s.ip_hash && ` · IP hash ${s.ip_hash.slice(0, 8)}…`}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => revokeOne(s.id)}
                  disabled={pending}
                  className="rounded-full border border-red-400/40 px-3 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-red-200 hover:bg-red-400/10 disabled:opacity-50"
                >
                  Revogar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {revoked.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm text-white">Recentes revogadas ({revoked.length})</h2>
          <ul className="flex flex-col gap-2">
            {revoked.slice(0, 10).map((s) => (
              <li key={s.id} className="rounded-2xl border border-white/5 bg-white/[0.01] p-3 opacity-50">
                <div className="text-xs text-white/70">
                  {s.browser ?? '—'} · {s.os ?? '—'} · revogada {new Date(s.revoked_at!).toLocaleDateString('pt-BR')}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function DeviceIcon({ kind }: { kind: string }) {
  const cls = 'h-4 w-4 text-gold-100';
  switch (kind) {
    case 'mobile': return <Smartphone className={cls} strokeWidth={1.5} />;
    case 'tablet': return <Tablet className={cls} strokeWidth={1.5} />;
    case 'desktop': return <Monitor className={cls} strokeWidth={1.5} />;
    default: return <Globe className={cls} strokeWidth={1.5} />;
  }
}
