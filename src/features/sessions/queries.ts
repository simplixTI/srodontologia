import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type SessionRow = {
  id: string;
  user_agent: string | null;
  device_kind: string | null;
  browser: string | null;
  os: string | null;
  ip_hash: string | null;
  first_seen_at: string;
  last_seen_at: string;
  revoked_at: string | null;
  revoke_reason: string | null;
  is_current: boolean;
};

export async function listMySessions(): Promise<SessionRow[]> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('app_sessions')
    .select('id, user_agent, device_kind, browser, os, ip_hash, first_seen_at, last_seen_at, revoked_at, revoke_reason, is_current')
    .eq('user_id', user.id)
    .order('last_seen_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as SessionRow[];
}
