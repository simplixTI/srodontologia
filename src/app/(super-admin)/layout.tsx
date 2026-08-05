import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getPlatformUser } from '@/lib/permissions/platform';
import { logoutAction } from '@/features/auth/actions/logout';
import { SuperAdminNav } from './SuperAdminNav';

export const dynamic = 'force-dynamic';

export default async function SuperAdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getPlatformUser();
  if (!user) redirect('/login?next=/super-admin');

  return (
    <div className="flex min-h-[100svh] bg-black text-white">
      <aside className="sticky top-0 hidden h-[100svh] w-60 shrink-0 flex-col border-r border-gold/10 bg-black/70 backdrop-blur lg:flex">
        <div className="flex h-16 items-center border-b border-gold/10 px-5">
          <Link href="/super-admin" className="font-display text-lg tracking-[0.3em] text-gold-100">
            SR · SUPER
          </Link>
        </div>
        <SuperAdminNav />
        <div className="mt-auto border-t border-gold/10 p-4">
          <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/40">
            {user.platform_role === 'super' ? 'Super' : 'Suporte'}
          </div>
          <div className="mt-1 truncate text-xs text-white">{user.full_name}</div>
          <div className="mt-1 truncate text-[0.6rem] text-white/50">{user.email}</div>
          <form action={logoutAction} className="mt-3">
            <button
              type="submit"
              className="w-full rounded-full border border-white/15 px-3 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-white/70 hover:border-white/30 hover:text-white"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
