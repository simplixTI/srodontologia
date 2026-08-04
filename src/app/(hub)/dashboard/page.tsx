import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Building2,
  UserCircle2,
  Users,
  Sparkles,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ROLE_LABELS } from '@/lib/permissions/roles';
import { getDashboardStats } from '@/features/dashboard/queries';
import { CUSTOMER_STATUS_LABELS, type CustomerStatus } from '@/lib/validations/dentists';
import { statusColor } from '@/components/hub/crm/statusColors';
import type { UserRole } from '@/types/database';

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
    { label: 'Clínicas ativas', value: stats.clinicsActive, href: '/clinicas', icon: Building2 },
    { label: 'Dentistas ativos', value: stats.dentistsActive, href: '/dentistas', icon: UserCircle2 },
    { label: 'Leads abertos', value: stats.leadsOpen, href: '/leads', icon: Users },
    { label: 'Clientes ativos', value: stats.activeCustomers, href: '/dentistas', icon: Sparkles },
    { label: 'Clientes premium', value: stats.premiumCustomers, href: '/dentistas', icon: Sparkles },
    { label: 'Taxa conversão', value: `${conversionRate}%`, href: '/leads', icon: TrendingUp }
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
          Visão consolidada do CRM e da base de clientes da SR Digital.
        </p>
      </header>

      {/* Real KPIs */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Link
              key={k.label}
              href={k.href}
              className="group rounded-2xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-5 card-hover"
            >
              <div className="flex items-center justify-between">
                <div className="grid h-8 w-8 place-items-center rounded-lg border border-gold/20 bg-black/40">
                  <Icon className="h-3.5 w-3.5 text-gold-100" strokeWidth={1.5} />
                </div>
                <ArrowRight className="h-3 w-3 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-gold-100" />
              </div>
              <div className="mt-4 font-display text-3xl leading-none text-white">
                {k.value}
              </div>
              <div className="mt-2 text-[0.55rem] uppercase tracking-[0.28em] text-white/50">
                {k.label}
              </div>
            </Link>
          );
        })}
      </section>

      {/* Pipeline distribution */}
      <section className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[0.55rem] uppercase tracking-[0.3em] text-gold-100">
              Pipeline comercial
            </div>
            <h2 className="mt-1 font-display text-2xl text-white">
              Distribuição por etapa
            </h2>
          </div>
          <Link
            href="/leads"
            className="inline-flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:gap-2"
          >
            Abrir pipeline <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {stats.leadsTotal === 0 ? (
          <p className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center text-sm text-white/50">
            Nenhum lead cadastrado ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {PIPELINE_ORDER.map((stage) => {
              const count = stats.pipelineDistribution[stage] ?? 0;
              const pct = stats.leadsTotal === 0 ? 0 : (count / stats.leadsTotal) * 100;
              return (
                <div key={stage} className="grid grid-cols-[180px_1fr_auto] items-center gap-3">
                  <span className={statusColor(stage)}>
                    {CUSTOMER_STATUS_LABELS[stage]}
                  </span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full bg-gold-gradient transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-xs text-white/60">
                    {count.toString().padStart(2, '0')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent activity split */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[0.55rem] uppercase tracking-[0.3em] text-gold-100">
                CRM
              </div>
              <h3 className="mt-1 font-display text-xl text-white">Leads recentes</h3>
            </div>
            <Link
              href="/leads"
              className="inline-flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:gap-2"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {stats.recentLeads.length === 0 ? (
            <p className="text-sm text-white/50">Nenhum lead ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.recentLeads.map((l) => (
                <Link
                  key={l.id}
                  href={`/leads/${l.id}`}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-gold/30"
                >
                  <div className="text-sm text-white">{l.full_name}</div>
                  <span className={statusColor(l.pipeline_stage as CustomerStatus)}>
                    {CUSTOMER_STATUS_LABELS[l.pipeline_stage as CustomerStatus]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[0.55rem] uppercase tracking-[0.3em] text-gold-100">
                Base
              </div>
              <h3 className="mt-1 font-display text-xl text-white">Dentistas recentes</h3>
            </div>
            <Link
              href="/dentistas"
              className="inline-flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:gap-2"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {stats.recentDentists.length === 0 ? (
            <p className="text-sm text-white/50">Nenhum dentista ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.recentDentists.map((d) => (
                <Link
                  key={d.id}
                  href={`/dentistas/${d.id}`}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-gold/30"
                >
                  <div className="text-sm text-white">{d.full_name}</div>
                  <span className={statusColor(d.customer_status as CustomerStatus)}>
                    {CUSTOMER_STATUS_LABELS[d.customer_status as CustomerStatus]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function greeting(): string {
  // Rough client-timezone-agnostic bucket; server renders once per request
  const h = new Date().getUTCHours() - 3; // BRT
  const local = ((h % 24) + 24) % 24;
  if (local < 12) return 'Bom dia';
  if (local < 18) return 'Boa tarde';
  return 'Boa noite';
}
