import type { Metadata } from 'next';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Alertas · SR Platform' };

export default async function AlertsPage() {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('operational_alerts')
    .select('id, source, severity, title, message, created_at, resolved_at, organization:organizations(name)')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <h1 className="font-display text-3xl text-white md:text-4xl">Alertas operacionais</h1>
        <p className="mt-2 text-sm text-white/60">
          Emitidos automaticamente por billing, jobs, workers, webhooks, domínios, storage.
        </p>
      </header>
      <ul className="flex flex-col gap-2">
        {(data ?? []).length === 0 && (
          <li className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center text-xs text-white/40">
            Nenhum alerta.
          </li>
        )}
        {(data ?? []).map((a) => {
          const row = a as unknown as {
            id: string;
            source: string;
            severity: 'info' | 'warning' | 'error' | 'critical';
            title: string;
            message: string | null;
            created_at: string;
            resolved_at: string | null;
            organization: { name: string } | null;
          };
          return (
            <li
              key={row.id}
              className={
                row.resolved_at
                  ? 'rounded-2xl border border-white/5 bg-white/[0.01] p-4 opacity-50'
                  : row.severity === 'critical' || row.severity === 'error'
                  ? 'rounded-2xl border border-red-400/25 bg-red-400/5 p-4'
                  : 'rounded-2xl border border-gold/15 bg-white/[0.02] p-4'
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/40">
                    {row.source} · {row.organization?.name ?? 'plataforma'}
                  </div>
                  <div className="mt-1 text-sm text-white">{row.title}</div>
                  {row.message && <div className="mt-1 text-xs text-white/60">{row.message}</div>}
                  <div className="mt-2 text-[0.55rem] uppercase tracking-[0.28em] text-white/40">
                    {new Date(row.created_at).toLocaleString('pt-BR')}
                  </div>
                </div>
                <SeverityPill s={row.severity} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SeverityPill({ s }: { s: 'info' | 'warning' | 'error' | 'critical' }) {
  const tone =
    s === 'critical' ? 'border-red-500/40 bg-red-500/10 text-red-100' :
    s === 'error'    ? 'border-red-400/30 bg-red-400/10 text-red-200' :
    s === 'warning'  ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-200' :
                       'border-white/15 bg-white/[0.05] text-white/70';
  return <span className={'rounded-full border px-2 py-1 text-[0.55rem] uppercase tracking-[0.28em] ' + tone}>{s}</span>;
}
