import type { Metadata } from 'next';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Usuários · SR Platform' };

export default async function UsuariosPlatformaPage() {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('id, email, full_name, role, status, platform_role, last_login_at, created_at, organization:organizations(name)')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <h1 className="font-display text-3xl text-white md:text-4xl">Usuários</h1>
      </header>
      <div className="overflow-x-auto rounded-2xl border border-gold/10 bg-white/[0.02]">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/40 text-[0.55rem] uppercase tracking-[0.28em] text-white/50">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Papel</th>
              <th className="px-4 py-3">Plataforma</th>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((u) => {
              const row = u as unknown as {
                id: string;
                email: string;
                full_name: string;
                role: string;
                status: string;
                platform_role: string | null;
                organization: { name: string } | null;
              };
              return (
                <tr key={row.id} className="border-t border-white/5">
                  <td className="px-4 py-3 text-white">{row.full_name}</td>
                  <td className="px-4 py-3 text-white/70">{row.email}</td>
                  <td className="px-4 py-3 text-white/60">{row.role}</td>
                  <td className="px-4 py-3">
                    {row.platform_role ? (
                      <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100">
                        {row.platform_role}
                      </span>
                    ) : (
                      <span className="text-white/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/60">{row.organization?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-white/80">{row.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
