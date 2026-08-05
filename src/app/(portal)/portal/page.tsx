import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, FolderPlus, MessageCircle, Bell, Sparkles, type LucideIcon } from 'lucide-react';
import {
  getMyDentistRecord,
  getPortalKpis,
  listPortalRecentActivity,
  listPortalNotifications
} from '@/features/portal/queries';
import { PUBLIC_STATUS_LABELS } from '@/lib/validations/cases';

export const metadata: Metadata = {
  title: 'Portal do Dentista · SR Digital'
};

export default async function PortalHomePage() {
  const [me, kpis, activity, notifications] = await Promise.all([
    getMyDentistRecord(),
    getPortalKpis(),
    listPortalRecentActivity(5),
    listPortalNotifications(5)
  ]);

  const firstName = me?.full_name.split(' ')[0] ?? 'Doutor(a)';

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Bem-vindo(a)
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>
        <h1 className="font-display text-3xl leading-tight text-white md:text-4xl">
          Olá, <span className="gold-text italic">{firstName}.</span>
        </h1>
        <p className="max-w-xl text-sm text-white/60 md:text-base">
          Seu centro de comando do SR Digital — acompanhe casos, aprove
          orçamentos e planejamentos, e mantenha seus pacientes no fluxo.
        </p>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Casos ativos" value={kpis.activeCount} />
        <KpiCard label="Aguardando você" value={kpis.pendingApprovalCount} highlight />
        <KpiCard label="Em entrega" value={kpis.awaitingDeliveryCount} />
        <KpiCard label="Finalizados no mês" value={kpis.completedThisMonth} />
      </section>

      {/* Quick actions */}
      <section className="grid gap-3 md:grid-cols-3">
        <QuickAction
          href="/portal/casos/novo"
          icon={FolderPlus}
          title="Novo caso"
          description="Envie um novo caso com fotos, tomografia e planejamento"
        />
        <QuickAction
          href="/portal/casos"
          icon={Sparkles}
          title="Meus casos"
          description="Acompanhe status, orçamentos e planejamentos em produção"
        />
        <QuickAction
          href="/portal/notificacoes"
          icon={Bell}
          title="Notificações"
          description="Aprovações pendentes, entregas e mensagens da equipe"
        />
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Últimos casos */}
        <section className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-5">
          <header className="mb-4 flex items-center justify-between">
            <h2 className="text-[0.6rem] uppercase tracking-[0.3em] text-white/60">
              Atividade recente
            </h2>
            <Link
              href="/portal/casos"
              className="inline-flex items-center gap-1 text-[0.6rem] uppercase tracking-[0.25em] text-gold-100 hover:text-gold-50"
            >
              Ver todos <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} />
            </Link>
          </header>
          {activity.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/40">
              Nenhum caso ainda. Comece enviando um novo caso.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {activity.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/portal/casos/${c.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-gold/20 hover:bg-white/[0.04]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm text-white">{c.title}</div>
                      <div className="text-[0.6rem] uppercase tracking-[0.25em] text-white/40">
                        {c.case_number} · {PUBLIC_STATUS_LABELS[c.public_status]}
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-white/40" strokeWidth={1.5} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Notificações */}
        <section className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-5">
          <header className="mb-4 flex items-center justify-between">
            <h2 className="text-[0.6rem] uppercase tracking-[0.3em] text-white/60">
              Suas notificações
            </h2>
            <Link
              href="/portal/notificacoes"
              className="inline-flex items-center gap-1 text-[0.6rem] uppercase tracking-[0.25em] text-gold-100 hover:text-gold-50"
            >
              Ver todas <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} />
            </Link>
          </header>
          {notifications.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/40">
              Nenhuma notificação por enquanto.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {notifications.map((n) => {
                const href = n.action_url?.startsWith('/casos/')
                  ? `/portal/casos/${n.action_url.replace('/casos/', '')}`
                  : n.action_url ?? '/portal/notificacoes';
                return (
                  <li key={n.id}>
                    <Link
                      href={href}
                      className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-gold/20 hover:bg-white/[0.04]"
                    >
                      <span
                        className={
                          n.read_at
                            ? 'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/20'
                            : 'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-300'
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-white">{n.title}</div>
                        {n.message && (
                          <div className="mt-0.5 truncate text-xs text-white/50">
                            {n.message}
                          </div>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Contact card */}
      <section className="rounded-3xl border border-gold/15 bg-black/60 p-5 md:p-6">
        <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <MessageCircle className="mt-1 h-5 w-5 text-gold-200" strokeWidth={1.5} />
            <div>
              <div className="text-sm text-white">
                Precisa falar direto com a equipe?
              </div>
              <div className="text-xs text-white/50">
                Fale via WhatsApp com o comercial do SR Digital.
              </div>
            </div>
          </div>
          <a
            href="https://api.whatsapp.com/send?phone=5532991651437&text=Ol%C3%A1%2C+sou+dentista+parceiro+do+SR+Digital"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-gold/30 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 transition hover:border-gold/60 hover:bg-gold/5"
          >
            Falar no WhatsApp
            <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} />
          </a>
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  highlight
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? 'rounded-2xl border border-gold/30 bg-gold/[0.04] p-4'
          : 'rounded-2xl border border-white/10 bg-white/[0.02] p-4'
      }
    >
      <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">
        {label}
      </div>
      <div
        className={
          highlight
            ? 'mt-2 font-display text-3xl text-gold-100'
            : 'mt-2 font-display text-3xl text-white'
        }
      >
        {value}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-2xl border border-gold/10 bg-white/[0.02] p-4 transition hover:border-gold/30 hover:bg-white/[0.04]"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-gold/20 bg-gold/5 text-gold-100">
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </span>
        <div className="text-sm text-white">{title}</div>
      </div>
      <p className="text-xs text-white/50">{description}</p>
    </Link>
  );
}
