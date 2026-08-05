import type { Metadata } from 'next';
import { listSecurityEvents } from '@/features/platform/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Logs de segurança · SR Platform' };

export default async function LogsPage() {
  const events = await listSecurityEvents();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <h1 className="font-display text-3xl text-white md:text-4xl">Logs de segurança</h1>
      </header>
      <div className="overflow-x-auto rounded-2xl border border-gold/10 bg-white/[0.02]">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/40 text-[0.55rem] uppercase tracking-[0.28em] text-white/50">
            <tr>
              <th className="px-4 py-3">Quando</th>
              <th className="px-4 py-3">Evento</th>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-xs text-white/40">
                  Nenhum evento.
                </td>
              </tr>
            )}
            {events.map((e) => {
              const row = e as unknown as {
                id: number;
                event_type: string;
                ip: string | null;
                created_at: string;
                organization: { name: string } | null;
                user: { full_name: string; email: string } | null;
              };
              return (
                <tr key={row.id} className="border-t border-white/5 text-xs">
                  <td className="px-4 py-3 text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
                    {new Date(row.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 font-mono text-white">{row.event_type}</td>
                  <td className="px-4 py-3 text-white/70">{row.organization?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-white/70">{row.user?.full_name ?? row.user?.email ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-white/50">{row.ip ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
