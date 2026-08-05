import type { Metadata } from 'next';
import { getQueueSnapshot, getEventStats, getAiUsageStats } from '@/features/observability/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Observabilidade · SR HUB' };

export default async function ObservabilidadePage() {
  const [queue, events, ai] = await Promise.all([
    getQueueSnapshot(),
    getEventStats(),
    getAiUsageStats()
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Sistema</div>
        <h1 className="mt-1 font-display text-2xl text-white md:text-3xl">Observabilidade</h1>
        <p className="mt-2 text-sm text-white/60">
          Filas, eventos e uso de IA em tempo quase real (últimas 24h / mês corrente).
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <Kpi label="Na fila" value={queue.queued} />
        <Kpi label="Rodando" value={queue.running} />
        <Kpi label="Falhas 24h" value={queue.failed_24h} tone={queue.failed_24h > 0 ? 'warn' : 'default'} />
        <Kpi label="Concluídos 24h" value={queue.completed_24h} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Panel title="Jobs por tipo (24h)">
          <Rank items={queue.byKind.map((k) => ({ key: k.kind, count: k.count }))} />
        </Panel>
        <Panel title={`Eventos (24h · total ${events.last24h})`}>
          <Rank items={events.byType.map((k) => ({ key: k.type, count: k.count }))} />
        </Panel>
        <Panel title={`IA (mês · ${ai.monthCalls} chamadas · ${ai.monthTokens.toLocaleString('pt-BR')} tokens)`}>
          <Rank items={ai.byFeature.map((f) => ({ key: f.feature, count: f.tokens }))} />
        </Panel>
      </section>
    </div>
  );
}

function Kpi({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'warn' }) {
  return (
    <div
      className={
        tone === 'warn'
          ? 'rounded-2xl border border-red-400/30 bg-red-400/5 p-4'
          : 'rounded-2xl border border-gold/10 bg-white/[0.02] p-4'
      }
    >
      <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/40">{label}</div>
      <div className="mt-1 font-display text-2xl text-white">{value.toLocaleString('pt-BR')}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-gold/10 bg-white/[0.02] p-5">
      <div className="text-[0.55rem] uppercase tracking-[0.28em] text-gold-100">Painel</div>
      <h3 className="mt-1 font-display text-lg text-white">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Rank({ items }: { items: { key: string; count: number }[] }) {
  if (items.length === 0) return <p className="text-xs text-white/40">sem dados</p>;
  const max = Math.max(...items.map((i) => i.count));
  return (
    <ul className="flex flex-col gap-2">
      {items.slice(0, 8).map((it) => (
        <li key={it.key} className="text-xs">
          <div className="flex items-center justify-between">
            <span className="truncate text-white/80">{it.key}</span>
            <span className="text-gold-100">{it.count.toLocaleString('pt-BR')}</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-gold/60 to-gold/20"
              style={{ width: `${(it.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
