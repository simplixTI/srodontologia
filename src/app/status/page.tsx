import type { Metadata } from 'next';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 30;
export const metadata: Metadata = { title: 'Status · SR Digital' };

/**
 * Public status page. Shows current status per component + last 10 incidents.
 * Never exposes internal stack traces, hosts or token metadata.
 */
export default async function PublicStatusPage() {
  const admin = createSupabaseAdminClient();
  const [{ data: openIncidents }, { data: recent }] = await Promise.all([
    admin.from('incidents').select('id, title, status, severity, affected, started_at').is('resolved_at', null).order('started_at', { ascending: false }),
    admin.from('incidents').select('id, title, status, severity, started_at, resolved_at').order('started_at', { ascending: false }).limit(10)
  ]);

  const open = (openIncidents ?? []) as unknown as {
    id: string; title: string; status: string; severity: string; affected: string[]; started_at: string;
  }[];
  const recentList = (recent ?? []) as unknown as {
    id: string; title: string; status: string; severity: string; started_at: string; resolved_at: string | null;
  }[];
  const overallOk = open.length === 0;

  const components = [
    { key: 'app', label: 'Aplicação' },
    { key: 'auth', label: 'Login e Auth' },
    { key: 'portal', label: 'Portal do dentista' },
    { key: 'storage', label: 'Armazenamento de arquivos' },
    { key: 'billing', label: 'Cobrança' },
    { key: 'email', label: 'E-mail transacional' },
    { key: 'jobs', label: 'Processamento de jobs' },
    { key: 'api', label: 'API pública' }
  ];

  const affected = new Set(open.flatMap((i) => i.affected ?? []));

  return (
    <div className="min-h-[100svh] bg-black text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
        <header>
          <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Status</div>
          <h1 className="mt-1 font-display text-4xl text-white">SR Digital</h1>
          <div className="mt-3 flex items-center gap-2">
            <span className={overallOk ? 'h-2 w-2 rounded-full bg-emerald-400' : 'h-2 w-2 rounded-full bg-yellow-400'} />
            <span className="text-sm text-white/80">
              {overallOk ? 'Todos os sistemas operacionais' : 'Incidente em andamento'}
            </span>
          </div>
        </header>

        <section>
          <h2 className="mb-3 text-sm text-white">Componentes</h2>
          <ul className="flex flex-col gap-2">
            {components.map((c) => {
              const isAffected = affected.has(c.key);
              return (
                <li key={c.key} className={
                  isAffected
                    ? 'flex items-center justify-between rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-3'
                    : 'flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-3'
                }>
                  <span className="text-sm text-white/80">{c.label}</span>
                  <span className={
                    isAffected
                      ? 'rounded-full border border-yellow-400/40 bg-yellow-400/10 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.28em] text-yellow-100'
                      : 'rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.28em] text-emerald-200'
                  }>
                    {isAffected ? 'degradado' : 'operacional'}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-sm text-white">Incidentes recentes</h2>
          {recentList.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center text-xs text-white/40">
              Sem incidentes registrados.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recentList.map((i) => (
                <li key={i.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-white">{i.title}</div>
                      <div className="mt-0.5 text-[0.55rem] uppercase tracking-[0.28em] text-white/40">
                        {new Date(i.started_at).toLocaleString('pt-BR')}
                        {i.resolved_at && ` · resolvido em ${new Date(i.resolved_at).toLocaleString('pt-BR')}`}
                      </div>
                    </div>
                    <span className={
                      i.resolved_at
                        ? 'rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.28em] text-emerald-200'
                        : 'rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.28em] text-yellow-100'
                    }>
                      {i.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
