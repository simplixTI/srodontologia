import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPlatformUser } from '@/lib/permissions/platform';
import { listDomains } from '@/features/domains/queries';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DomainsAdminPanel } from './DomainsAdminPanel';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Domínios · SR SUPER' };

export default async function DomainsSuperAdminPage() {
  const platform = await getPlatformUser();
  if (!platform) redirect('/login?next=/super-admin/dominios');

  const supabase = createSupabaseServerClient();
  const [{ data: tenants }, domains] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, slug')
      .order('name', { ascending: true }),
    listDomains()
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Plataforma</div>
        <h1 className="mt-1 font-display text-3xl text-white md:text-4xl">Domínios</h1>
        <p className="mt-2 text-sm text-white/60">
          Gerencie hostnames de tenants. Somente {' '}
          <span className="text-white">SUPER_ADMIN</span> pode adicionar, verificar
          ou remover. DNS, SSL e propagação são responsabilidade da plataforma.
        </p>
      </header>
      <DomainsAdminPanel
        initial={domains}
        tenants={(tenants ?? []) as Array<{ id: string; name: string; slug: string | null }>}
      />
    </div>
  );
}
