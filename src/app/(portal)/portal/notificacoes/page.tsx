import type { Metadata } from 'next';
import Link from 'next/link';
import { listPortalNotifications } from '@/features/portal/queries';

export const metadata: Metadata = {
  title: 'Notificações · Portal SR Digital'
};

export default async function PortalNotificacoesPage() {
  const notifications = await listPortalNotifications(50);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
          Notificações
        </div>
        <h1 className="mt-1 font-display text-2xl text-white md:text-3xl">
          Últimos alertas
        </h1>
      </header>

      {notifications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-white/50">Você não tem notificações ainda.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => {
            const href = n.action_url?.startsWith('/casos/')
              ? `/portal/casos/${n.action_url.replace('/casos/', '')}`
              : n.action_url ?? '#';
            return (
              <li key={n.id}>
                <Link
                  href={href}
                  className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition hover:border-gold/25 hover:bg-white/[0.04]"
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
                      <div className="mt-0.5 text-xs text-white/60">
                        {n.message}
                      </div>
                    )}
                    <div className="mt-1 text-[0.55rem] uppercase tracking-[0.25em] text-white/40">
                      {new Date(n.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
