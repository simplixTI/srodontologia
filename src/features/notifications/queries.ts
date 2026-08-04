import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type Notification = {
  id: string;
  case_id: string | null;
  type: string;
  title: string;
  message: string | null;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
};

export async function listMyNotifications(limit = 20) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('id, case_id, type, title, message, action_url, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as Notification[];
}

export async function countMyUnread(): Promise<number> {
  const supabase = createSupabaseServerClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
