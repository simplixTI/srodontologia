import type { Metadata } from 'next';
import { listSubscriptions } from '@/features/platform/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Assinaturas · SR Platform' };

export default async function AssinaturasPage() {
  const subs = await listSubscriptions();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <h1 className="font-display text-3xl text-white md:text-4xl">Assinaturas</h1>
        <p className="mt-2 text-sm text-white/60">{subs.length} assinaturas registradas.</p>
      </header>
      <div className="overflow-x-auto rounded-2xl border border-gold/10 bg-white/[0.02]">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/40 text-[0.55rem] uppercase tracking-[0.28em] text-white/50">
            <tr>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Ciclo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Fim do período</th>
              <th className="px-4 py-3">Provider</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => {
              const row = s as unknown as {
                id: string;
                status: string;
                billing_cycle: string;
                current_period_end: string;
                external_provider: string | null;
                organization: { name: string } | null;
                plan: { name: string; code: string } | null;
              };
              return (
                <tr key={row.id} className="border-t border-white/5">
                  <td className="px-4 py-3 text-white">{row.organization?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-white/80">{row.plan?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-white/60">{row.billing_cycle}</td>
                  <td className="px-4 py-3 text-white/80">{row.status}</td>
                  <td className="px-4 py-3 text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
                    {new Date(row.current_period_end).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-white/60">{row.external_provider ?? 'mock'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
