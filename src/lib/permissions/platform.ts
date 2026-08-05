import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { PlatformRole } from '@/types/database';

export type { PlatformRole };

export type PlatformUser = {
  id: string;
  email: string;
  full_name: string;
  platform_role: PlatformRole;
};

/** Returns the caller if they are a platform admin, otherwise null. */
export async function getPlatformUser(): Promise<PlatformUser | null> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, platform_role, status')
    .eq('id', user.id)
    .maybeSingle<{
      id: string;
      email: string;
      full_name: string;
      platform_role: PlatformRole | null;
      status: string;
    }>();
  if (!data || data.status !== 'active' || !data.platform_role) return null;
  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    platform_role: data.platform_role
  };
}

/** Throws 'platform_forbidden' se caller não for platform admin. */
export async function requirePlatformUser(): Promise<PlatformUser> {
  const u = await getPlatformUser();
  if (!u) throw new Error('platform_forbidden');
  return u;
}

/** True se caller é platform admin com privilégio 'super'. */
export async function isSuperPlatformAdmin(): Promise<boolean> {
  const u = await getPlatformUser();
  return u?.platform_role === 'super';
}
