import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { INTERNAL_ROLES } from '@/lib/permissions/roles';
import { Sidebar } from '@/components/hub/Sidebar';
import { Header } from '@/components/hub/Header';
import { NotConfiguredScreen } from '@/components/hub/NotConfiguredScreen';
import type { UserRole } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function HubLayout({
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
    .select('id, full_name, email, role, avatar_url, status, must_change_password')
    .eq('id', user.id)
    .maybeSingle<{
      id: string;
      full_name: string;
      email: string;
      role: UserRole;
      avatar_url: string | null;
      status: string;
      must_change_password: boolean;
    }>();

  if (!profile) {
    await supabase.auth.signOut();
    redirect('/login');
  }
  if (profile.status !== 'active') {
    await supabase.auth.signOut();
    redirect('/login?reason=inactive');
  }
  if (!INTERNAL_ROLES.includes(profile.role as UserRole)) {
    redirect('/portal');
  }

  return (
    <div className="flex min-h-[100svh] bg-black text-white">
      <Sidebar />
      <div className="flex min-h-[100svh] min-w-0 flex-1 flex-col">
        <Header
          user={{
            full_name: profile.full_name,
            email: profile.email,
            role: profile.role as UserRole,
            avatar_url: profile.avatar_url
          }}
        />
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
