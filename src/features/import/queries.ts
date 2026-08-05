import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ImportListItem = {
  id: string;
  entity: string;
  status: string;
  dry_run: boolean;
  row_count: number | null;
  rows_ok: number;
  rows_error: number;
  rows_duplicate: number;
  created_at: string;
  completed_at: string | null;
};

export async function listRecentImports(limit = 20): Promise<ImportListItem[]> {
  const supa = createSupabaseServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return [];
  const { data: profile } = await supa
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string | null }>();
  if (!profile?.organization_id) return [];

  const { data } = await supa
    .from('data_imports')
    .select('id, entity, status, dry_run, row_count, rows_ok, rows_error, rows_duplicate, created_at, completed_at')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []) as ImportListItem[];
}
