import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { EXTERNAL_ROLES } from '@/lib/permissions/roles';
import { LogoLockup } from '@/components/ui/Logo';
import { logoutAction } from '@/features/auth/actions/logout';
import type { UserRole } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, status')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) redirect('/login');
  if (!EXTERNAL_ROLES.includes(profile.role as UserRole)) redirect('/dashboard');
  if (profile.status !== 'active') redirect('/login?reason=inactive');

  return (
    <div className="min-h-[100svh] bg-black text-white">
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-gold/10 bg-black/70 px-6 backdrop-blur">
        <Link href="/portal" className="inline-flex">
          <LogoLockup width={110} />
        </Link>
        <div className="flex items-center gap-4">
          <div className="hidden text-right md:block">
            <div className="text-[0.75rem] text-white">{profile.full_name}</div>
            <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/40">
              Portal do Dentista
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-full border border-gold/25 px-4 py-1.5 text-[0.6rem] uppercase tracking-[0.3em] text-white/70 transition hover:border-gold/60 hover:text-gold-100"
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
