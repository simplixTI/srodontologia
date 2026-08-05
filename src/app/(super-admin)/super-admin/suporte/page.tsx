import type { Metadata } from 'next';
import { listSupportTicketsPlatform } from '@/features/platform/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Suporte · SR Platform' };

export default async function SuportePage() {
  const tickets = await listSupportTicketsPlatform();
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <h1 className="font-display text-3xl text-white md:text-4xl">Suporte</h1>
      </header>
      <ul className="flex flex-col gap-2">
        {tickets.length === 0 && (
          <li className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center text-xs text-white/40">
            Nenhum ticket aberto.
          </li>
        )}
        {tickets.map((t) => {
          const row = t as unknown as {
            id: string;
            subject: string;
            status: string;
            priority: string;
            created_at: string;
            organization: { name: string } | null;
          };
          return (
            <li key={row.id} className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm text-white">{row.subject}</div>
                  <div className="mt-1 text-[0.55rem] uppercase tracking-[0.28em] text-white/40">
                    {row.organization?.name ?? '—'} · {new Date(row.created_at).toLocaleString('pt-BR')}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full border border-white/15 bg-white/[0.05] px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.28em] text-white/70">
                    {row.status}
                  </span>
                  <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100">
                    {row.priority}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
