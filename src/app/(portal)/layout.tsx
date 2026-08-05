import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { ROLES } from '@/lib/permissions/roles';
import { NotConfiguredScreen } from '@/components/hub/NotConfiguredScreen';
import { PortalHeader } from '@/components/portal/PortalHeader';
import { PortalSidebar } from '@/components/portal/PortalSidebar';
import { PortalBottomNav } from '@/components/portal/PortalBottomNav';
import { countPortalUnread } from '@/features/portal/queries';
import { logoutAction } from '@/features/auth/actions/logout';
import type { UserRole } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({
  children
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) return <NotConfiguredScreen />;

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role, status, must_change_password')
    .eq('id', user.id)
    .maybeSingle<{
      full_name: string;
      email: string;
      role: UserRole;
      status: string;
      must_change_password: boolean;
    }>();

  if (!profile) redirect('/login');
  if (profile.status !== 'active') redirect('/login?reason=inactive');
  if (profile.must_change_password) redirect('/change-password');
  if (profile.role !== ROLES.DENTIST) redirect('/dashboard');

  const { data: dentist } = await supabase
    .from('dentists')
    .select('id, active, archived_at')
    .eq('profile_id', user.id)
    .maybeSingle<{ id: string; active: boolean; archived_at: string | null }>();

  if (!dentist || !dentist.active || dentist.archived_at) {
    return (
      <div className="min-h-[100svh] bg-black text-white">
        <div className="mx-auto flex min-h-[100svh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Portal do Dentista
          </span>
          <h1 className="font-display text-3xl text-white">
            Acesso <span className="gold-text italic">indisponível</span>
          </h1>
          <p className="text-white/60">
            Sua conta ainda não foi vinculada a um cadastro de dentista ativo.
            Entre em contato com o laboratório para liberar o acesso.
          </p>
          <form action={logoutAction}>
            <button className="mt-4 rounded-full border border-gold/30 px-5 py-2 text-[0.6rem] uppercase tracking-[0.3em] text-white/80 transition hover:border-gold/60 hover:text-gold-100">
              Sair
            </button>
          </form>
        </div>
      </div>
    );
  }

  const unread = await countPortalUnread().catch(() => 0);

  return (
    <div className="flex min-h-[100svh] flex-col bg-black text-white">
      <PortalHeader fullName={profile.full_name} email={profile.email} />
      <div className="flex flex-1">
        <PortalSidebar />
        <main className="min-w-0 flex-1 pb-24 lg:pb-10">{children}</main>
      </div>
      <PortalBottomNav unreadCount={unread} />
    </div>
  );
}
