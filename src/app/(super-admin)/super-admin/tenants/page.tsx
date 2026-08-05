import type { Metadata } from 'next';
import Link from 'next/link';
import { listTenants } from '@/features/platform/queries';

export const metadata: Metadata = { title: 'Tenants · SR Platform' };
export const dynamic = 'force-dynamic';

export default async function TenantsPage() {
  const tenants = await listTenants();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Plataforma</div>
        <h1 className="mt-1 font-display text-3xl text-white md:text-4xl">Tenants</h1>
        <p className="mt-2 text-sm text-white/60">{tenants.length} organizações cadastradas.</p>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-gold/10 bg-white/[0.02]">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/40 text-[0.55rem] uppercase tracking-[0.28em] text-white/50">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Health</th>
              <th className="px-4 py-3">Criado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-xs text-white/40">
                  Nenhum tenant.
                </td>
              </tr>
            )}
            {tenants.map((t) => (
              <tr key={t.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                <td className="px-4 py-3 text-white">{t.name}</td>
                <td className="px-4 py-3 text-white/60">{t.slug ?? '—'}</td>
                <td className="px-4 py-3 text-white/80">{t.plan_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <StatusPill status={t.subscription_status} />
                </td>
                <td className="px-4 py-3 text-white/70">{t.health_score ?? '—'}</td>
                <td className="px-4 py-3 text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
                  {new Date(t.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/super-admin/tenants/${t.id}`}
                    className="text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:text-gold-50"
                  >
                    Detalhes →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tones: Record<string, string> = {
    active: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    trial: 'border-gold/40 bg-gold/10 text-gold-100',
    past_due: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
    suspended: 'border-red-400/30 bg-red-400/10 text-red-200',
    cancelled: 'border-white/20 bg-white/[0.05] text-white/60',
    expired: 'border-white/20 bg-white/[0.05] text-white/60'
  };
  return (
    <span
      className={
        'inline-flex rounded-full border px-2 py-1 text-[0.55rem] uppercase tracking-[0.28em] ' +
        (tones[status] ?? 'border-white/20 bg-white/[0.05] text-white/60')
      }
    >
      {status}
    </span>
  );
}
