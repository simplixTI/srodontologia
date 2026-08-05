import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Building2,
  UserCircle2,
  Users,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Briefcase,
  AlertTriangle,
  DollarSign,
  Clock
} from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ROLE_LABELS } from '@/lib/permissions/roles';
import { getDashboardStats } from '@/features/dashboard/queries';
import {
  CasesLast30dChart,
  CasesByStatusChart,
  RevenueLast6MonthsChart
} from '@/components/hub/dashboard/DashboardCharts';
import { CUSTOMER_STATUS_LABELS, type CustomerStatus } from '@/lib/validations/dentists';
import { statusColor } from '@/components/hub/crm/statusColors';
import type { UserRole } from '@/types/database';
import { DashboardInsightsCard } from '@/components/ai/DashboardInsightsCard';

export const metadata: Metadata = { title: 'Dashboard · SR HUB' };
export const dynamic = 'force-dynamic';

const PIPELINE_ORDER: CustomerStatus[] = [
  'lead',
  'contacted',
  'presentation_scheduled',
  'presentation_completed',
  'first_case',
  'active_customer',
  'premium_customer',
  'inactive_customer',
  'lost'
];

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user!.id)
    .single<{ full_name: string; role: UserRole }>();

  const firstName = profile?.full_name.split(' ')[0] ?? '';
  const stats = await getDashboardStats();

  const conversionRate =
    stats.leadsTotal === 0
      ? 0
      : Math.round((stats.leadsConverted / stats.leadsTotal) * 100);

  const kpis = [
    { label: 'Casos em produção', value: stats.casesInProgress, href: '/casos', icon: Briefcase, tone: 'default' as const },
    { label: 'Casos atrasados', value: stats.casesOverdue, href: '/casos', icon: AlertTriangle, tone: stats.casesOverdue > 0 ? 'danger' as const : 'default' as const },
    { label: 'Rascunhos', value: stats.casesDrafts, href: '/casos', icon: Clock, tone: 'default' as const },
    { label: 'Faturamento mês', value: fmtCurrency(stats.revenueThisMonth), href: '/casos', icon: DollarSign, tone: 'default' as const },
    { label: 'Leads abertos', value: stats.leadsOpen, href: '/leads', icon: Users, tone: 'default' as const },
    { label: 'Clientes ativos', value: stats.activeCustomers + stats.premiumCustomers, href: '/dentistas', icon: Sparkles, tone: 'default' as const },
    { label: 'Dentistas', value: stats.dentistsActive, href: '/dentistas', icon: UserCircle2, tone: 'default' as const },
    { label: 'Clínicas', value: stats.clinicsActive, href: '/clinicas', icon: Building2, tone: 'default' as const }
  ];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Dashboard
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
          <span className="text-[0.55rem] uppercase tracking-[0.32em] text-white/40">
            {ROLE_LABELS[profile!.role]}
          </span>
        </div>
        <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
          {greeting()}, <span className="gold-text italic">{firstName}.</span>
        </h1>
        <p className="text-white/60">
          Visão executiva da operação · dados em tempo real.
        </p>
      </header>

      {/* AI insights card */}
      <DashboardInsightsCard />

      {/* KPI grid */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Link
              key={k.label}
              href={k.href}
              className={
                'group rounded-2xl border p-5 card-hover ' +
                (k.tone === 'danger'
                  ? 'border-rose-400/25 bg-rose-400/5'
                  : 'border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent')
              }
            >
              <div className="flex items-center justify-between">
                <div
                  className={
                    'grid h-8 w-8 place-items-center rounded-lg border ' +
                    (k.tone === 'danger'
                      ? 'border-rose-400/40 bg-rose-400/10'
                      : 'border-gold/20 bg-black/40')
                  }
                >
                  <Icon
                    className={
                      'h-3.5 w-3.5 ' + (k.tone === 'danger' ? 'text-rose-200' : 'text-gold-100')
                    }
                    strokeWidth={1.5}
                  />
                </div>
                <ArrowRight className="h-3 w-3 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-gold-100" />
              </div>
              <div
                className={
                  'mt-4 font-display text-3xl leading-none ' +
                  (k.tone === 'danger' ? 'text-rose-200' : 'text-white')
                }
              >
                {k.value}
              </div>
              <div className="mt-2 text-[0.55rem] uppercase tracking-[0.28em] text-white/50">
                {k.label}
              </div>
            </Link>
          );
        })}
      </section>

      {/* Charts row */}
      <section className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Faturamento · 6 meses" hint="Somatório de orçamentos aprovados">
          {stats.revenueLast6Months.some((r) => r.total > 0) ? (
            <RevenueLast6MonthsChart data={stats.revenueLast6Months} />
          ) : (
            <EmptyChart label="Sem receitas registradas" />
          )}
        </ChartCard>

        <ChartCard title="Casos por status" hint={`${stats.casesTotal} casos ativos no total`}>
          {stats.casesByStatus.length > 0 ? (
            <CasesByStatusChart data={stats.casesByStatus} />
          ) : (
            <EmptyChart label="Ainda sem casos" />
          )}
        </ChartCard>

        <ChartCard title="Casos criados · 30 dias" hint="Por dia (bucket UTC)">
          {stats.casesLast30d.length > 0 ? (
            <CasesLast30dChart data={stats.casesLast30d} />
          ) : (
            <EmptyChart label="Sem histórico" />
          )}
        </ChartCard>
      </section>

      {/* Rankings + Pipeline */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-6">
          <div className="text-[0.55rem] uppercase tracking-[0.3em] text-gold-100">
            Ranking
          </div>
          <h3 className="mt-1 font-display text-xl text-white">Top dentistas</h3>
          {stats.topDentistsByCases.length === 0 ? (
            <p className="mt-4 text-sm text-white/50">Sem dados ainda.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {stats.topDentistsByCases.map((d, i) => (
                <li key={d.dentist_id}>
                  <Link
                    href={`/dentistas/${d.dentist_id}`}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-gold/30"
                  >
                    <span className="font-mono text-xs text-white/40 w-4">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-white">{d.name}</span>
                    <span className="rounded-full border border-gold/20 bg-gold/5 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100">
                      {d.count} caso{d.count !== 1 ? 's' : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-6">
          <div className="text-[0.55rem] uppercase tracking-[0.3em] text-gold-100">
            Ranking
          </div>
          <h3 className="mt-1 font-display text-xl text-white">Trabalhos mais pedidos</h3>
          {stats.topCaseTypes.length === 0 ? (
            <p className="mt-4 text-sm text-white/50">Sem dados ainda.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {stats.topCaseTypes.map((t, i) => (
                <li
                  key={t.name}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
                >
                  <span className="font-mono text-xs text-white/40 w-4">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-white">{t.name}</span>
                  <span className="rounded-full border border-gold/20 bg-gold/5 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100">
                    {t.count}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[0.55rem] uppercase tracking-[0.3em] text-gold-100">CRM</div>
              <h3 className="mt-1 font-display text-xl text-white">Pipeline</h3>
            </div>
            <Link href="/leads" className="text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:text-gold-50">
              Abrir →
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {PIPELINE_ORDER.map((stage) => {
              const count = stats.pipelineDistribution[stage] ?? 0;
              const pct = stats.leadsTotal === 0 ? 0 : (count / stats.leadsTotal) * 100;
              return (
                <div key={stage} className="grid grid-cols-[1fr_60px_28px] items-center gap-2">
                  <span className={statusColor(stage) + ' truncate'}>
                    {CUSTOMER_STATUS_LABELS[stage]}
                  </span>
                  <div className="h-1 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full bg-gold-gradient transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-right font-mono text-[0.6rem] text-white/50">
                    {count.toString().padStart(2, '0')}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-300" strokeWidth={1.5} />
              {conversionRate}% conversão
            </span>
            <span>{stats.leadsTotal} leads · {stats.leadsConverted} convertidos</span>
          </div>
        </div>
      </section>

      {/* Recent activity + recent creations */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[0.55rem] uppercase tracking-[0.3em] text-gold-100">Atividades</div>
              <h3 className="mt-1 font-display text-xl text-white">Últimas mudanças de status</h3>
            </div>
          </div>
          {stats.recentActivities.length === 0 ? (
            <p className="mt-4 text-sm text-white/50">Sem atividades recentes.</p>
          ) : (
            <ul className="mt-4 space-y-1.5">
              {stats.recentActivities.slice(0, 10).map((a) => {
                const inner = (
                  <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm">
                    <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-300" />
                    <div className="min-w-0 flex-1">
                      <div className="text-white">{a.title}</div>
                      {a.subtitle && (
                        <div className="mt-0.5 truncate text-xs text-white/50">{a.subtitle}</div>
                      )}
                    </div>
                    <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/40">
                      {timeAgo(a.when)}
                    </div>
                  </div>
                );
                return a.href ? (
                  <li key={a.id}>
                    <Link href={a.href} className="block transition hover:opacity-90">
                      {inner}
                    </Link>
                  </li>
                ) : (
                  <li key={a.id}>{inner}</li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-6">
          <div className="text-[0.55rem] uppercase tracking-[0.3em] text-gold-100">Novos cadastros</div>
          <h3 className="mt-1 font-display text-xl text-white">Dentistas recentes</h3>
          {stats.recentDentists.length === 0 ? (
            <p className="mt-4 text-sm text-white/50">Nenhum ainda.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {stats.recentDentists.slice(0, 5).map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/dentistas/${d.id}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-gold/30"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-white">{d.full_name}</span>
                    <span className={statusColor(d.customer_status as CustomerStatus) + ' shrink-0'}>
                      {CUSTOMER_STATUS_LABELS[d.customer_status as CustomerStatus]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function ChartCard({
  title,
  hint,
  children
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-6">
      <div className="mb-4">
        <div className="text-[0.55rem] uppercase tracking-[0.3em] text-gold-100">Gráfico</div>
        <h3 className="mt-1 font-display text-lg text-white">{title}</h3>
        {hint && <p className="mt-0.5 text-[0.6rem] uppercase tracking-[0.25em] text-white/40">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-56 items-center justify-center text-sm text-white/40">
      {label}
    </div>
  );
}

function fmtCurrency(n: number): string {
  if (n === 0) return 'R$ 0';
  if (n >= 1000)
    return `R$ ${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  return `R$ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

function greeting(): string {
  const h = new Date().getUTCHours() - 3;
  const local = ((h % 24) + 24) % 24;
  if (local < 12) return 'Bom dia';
  if (local < 18) return 'Boa tarde';
  return 'Boa noite';
}
