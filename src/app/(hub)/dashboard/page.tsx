import type { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ROLE_LABELS } from '@/lib/permissions/roles';
import type { UserRole } from '@/types/database';

export const metadata: Metadata = {
  title: 'Dashboard · SR HUB'
};

export const dynamic = 'force-dynamic';

const kpis = [
  { label: 'Casos recebidos hoje',            value: '—', hint: 'em breve' },
  { label: 'Casos aguardando análise',        value: '—', hint: 'em breve' },
  { label: 'Orçamentos aguardando aprovação', value: '—', hint: 'em breve' },
  { label: 'Casos em produção',               value: '—', hint: 'em breve' },
  { label: 'Casos atrasados',                 value: '—', hint: 'em breve' },
  { label: 'Faturamento do mês',              value: '—', hint: 'em breve' }
];

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user!.id)
    .single();

  const firstName = profile?.full_name.split(' ')[0] ?? '';

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Dashboard
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
          <span className="text-[0.55rem] uppercase tracking-[0.32em] text-white/40">
            {ROLE_LABELS[profile!.role as UserRole]}
          </span>
        </div>
        <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
          Bem-vinda, <span className="gold-text italic">{firstName}.</span>
        </h1>
        <p className="max-w-2xl text-white/60">
          A Fase 1 do SR HUB está pronta. Nas próximas fases este dashboard será
          preenchido com KPIs reais, funis, gráficos e alertas.
        </p>
      </header>

      {/* KPI grid — placeholder */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-6"
          >
            <div className="text-[0.6rem] uppercase tracking-[0.3em] text-white/50">
              {k.label}
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-4xl leading-none text-white">
                {k.value}
              </span>
              <span className="text-[0.6rem] uppercase tracking-[0.3em] text-gold-100">
                {k.hint}
              </span>
            </div>
            <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/5">
              <div className="h-full w-1/6 bg-gold-gradient" />
            </div>
          </div>
        ))}
      </section>

      {/* Phase roadmap */}
      <section className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-8">
        <div className="text-[0.6rem] uppercase tracking-[0.3em] text-gold-100">
          Roadmap SR HUB
        </div>
        <h2 className="mt-3 font-display text-2xl text-white md:text-3xl">
          Próximas fases
        </h2>
        <ul className="mt-6 grid gap-3 text-sm text-white/70 md:grid-cols-3">
          {[
            'FASE 2 · CRM + Dentistas + Clínicas + Pipeline comercial',
            'FASE 3 · Casos clínicos + Upload de arquivos + Timeline',
            'FASE 4 · Portal do Dentista + Novo caso + Mensagens',
            'FASE 5 · Orçamentos + Versionamento + Aprovação comercial',
            'FASE 6 · Planejamento técnico + Aprovação técnica',
            'FASE 7 · Produção + Controle de qualidade + Prazos',
            'FASE 8 · Financeiro + Entregas + Notificações',
            'FASE 9 · Relatórios + Auditoria + Testes finais'
          ].map((p) => (
            <li
              key={p}
              className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4"
            >
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-300" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
