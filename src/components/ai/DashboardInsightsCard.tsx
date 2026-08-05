import { Sparkles } from 'lucide-react';
import { queryLabInsights } from '@/features/ai/insights';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function DashboardInsightsCard() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string }>();
  if (!profile?.organization_id) return null;

  const insights = await queryLabInsights(profile.organization_id, '');
  const raw = insights.raw as {
    activeCases: number;
    overdue: number;
    thisMonthDelivered: number;
    topClientsThisMonth: { key: string; count: number }[];
    byTypeThisMonth: { key: string; count: number }[];
  };

  return (
    <section className="rounded-3xl border border-gold/15 bg-gradient-to-b from-gold/[0.04] to-transparent p-5">
      <header className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-gold-200" strokeWidth={1.5} />
        <h3 className="text-sm text-white">Insights automáticos</h3>
      </header>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Metric label="Ativos" value={raw.activeCases} />
        <Metric label="Atrasados" value={raw.overdue} tone={raw.overdue > 0 ? 'warn' : 'default'} />
        <Metric label="Entregues no mês" value={raw.thisMonthDelivered} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <RankList title="Clientes com mais casos" items={raw.topClientsThisMonth.slice(0, 3)} />
        <RankList title="Trabalhos recorrentes" items={raw.byTypeThisMonth.slice(0, 3)} />
      </div>
    </section>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'warn' }) {
  return (
    <div
      className={
        tone === 'warn'
          ? 'rounded-2xl border border-red-400/30 bg-red-400/5 p-3'
          : 'rounded-2xl border border-white/10 bg-white/[0.02] p-3'
      }
    >
      <div className="text-[0.5rem] uppercase tracking-[0.28em] text-white/50">{label}</div>
      <div className="mt-1 text-lg text-white">{value}</div>
    </div>
  );
}

function RankList({ title, items }: { title: string; items: { key: string; count: number }[] }) {
  return (
    <div>
      <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">{title}</div>
      <ol className="mt-2 flex flex-col gap-1 text-xs text-white/80">
        {items.length === 0 && <li className="text-white/40">sem dados</li>}
        {items.map((it, i) => (
          <li key={it.key} className="flex items-center justify-between">
            <span className="truncate">{i + 1}. {it.key}</span>
            <span className="text-gold-100">{it.count}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
