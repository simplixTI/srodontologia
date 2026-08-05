import type { Metadata } from 'next';
import { getPlatformStatus, type ServiceStatus } from '@/lib/observability/status';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Status · SR Platform' };

export default async function StatusPage() {
  const checks = await getPlatformStatus();
  const overall: ServiceStatus = pickOverall(checks.map((c) => c.status));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <h1 className="font-display text-3xl text-white md:text-4xl">Status da plataforma</h1>
        <div className="mt-2 flex items-center gap-2">
          <StatusDot s={overall} />
          <span className="text-sm text-white/80">{labelFor(overall)}</span>
        </div>
      </header>

      <ul className="flex flex-col gap-2">
        {checks.map((c) => (
          <li key={c.key} className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <StatusDot s={c.status} />
                <div>
                  <div className="text-sm text-white">{c.label}</div>
                  {c.detail && <div className="mt-0.5 text-xs text-white/50">{c.detail}</div>}
                </div>
              </div>
              <span className="text-[0.55rem] uppercase tracking-[0.28em] text-white/60">{labelFor(c.status)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusDot({ s }: { s: ServiceStatus }) {
  const color = {
    operational: 'bg-emerald-400',
    degraded: 'bg-yellow-400',
    partial_outage: 'bg-orange-400',
    major_outage: 'bg-red-500',
    maintenance: 'bg-white/40'
  }[s];
  return <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />;
}

function labelFor(s: ServiceStatus): string {
  return {
    operational: 'Operacional',
    degraded: 'Degradado',
    partial_outage: 'Falha parcial',
    major_outage: 'Falha grave',
    maintenance: 'Manutenção'
  }[s];
}

function pickOverall(statuses: ServiceStatus[]): ServiceStatus {
  const order: ServiceStatus[] = ['major_outage', 'partial_outage', 'degraded', 'maintenance', 'operational'];
  for (const s of order) if (statuses.includes(s)) return s;
  return 'operational';
}
