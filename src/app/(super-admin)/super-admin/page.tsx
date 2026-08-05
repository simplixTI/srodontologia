import type { Metadata } from 'next';
import { Building2, Users, Sparkles, DollarSign, AlertTriangle, Clock } from 'lucide-react';
import { getPlatformStats } from '@/features/platform/queries';

export const metadata: Metadata = { title: 'Super Admin · SR Platform' };
export const dynamic = 'force-dynamic';

export default async function SuperAdminHomePage() {
  const stats = await getPlatformStats();

  const kpis = [
    { label: 'Tenants', value: stats.totalTenants, icon: Building2 },
    { label: 'Ativos', value: stats.activeTenants, icon: Sparkles },
    { label: 'Em trial', value: stats.trialTenants, icon: Clock },
    { label: 'Suspensos', value: stats.suspendedTenants, icon: AlertTriangle, warn: stats.suspendedTenants > 0 },
    { label: 'Usuários totais', value: stats.totalUsers, icon: Users },
    { label: 'Casos no mês', value: stats.casesThisMonth, icon: Building2 },
    { label: 'MRR (pago mês)', value: formatBRL(stats.mrr), icon: DollarSign }
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Plataforma</div>
        <h1 className="mt-1 font-display text-3xl text-white md:text-4xl">Visão geral</h1>
        <p className="mt-2 text-sm text-white/60">Métricas em tempo real da operação SaaS.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className={
                k.warn
                  ? 'rounded-2xl border border-red-400/30 bg-red-400/5 p-4'
                  : 'rounded-2xl border border-gold/15 bg-white/[0.02] p-4'
              }
            >
              <div className="flex items-center justify-between">
                <Icon className={k.warn ? 'h-4 w-4 text-red-300' : 'h-4 w-4 text-gold-100'} strokeWidth={1.5} />
              </div>
              <div className={k.warn ? 'mt-3 font-display text-2xl text-red-200' : 'mt-3 font-display text-2xl text-white'}>
                {k.value}
              </div>
              <div className="mt-1 text-[0.55rem] uppercase tracking-[0.28em] text-white/50">{k.label}</div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
