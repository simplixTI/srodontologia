import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type DomainRow = {
  id: string;
  hostname: string;
  status: 'pending' | 'verified' | 'active' | 'error';
  verification_token: string;
  verified_at: string | null;
  ssl_ready_at: string | null;
  created_at: string;
};

export async function listDomains(): Promise<DomainRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('tenant_domains')
    .select('id, hostname, status, verification_token, verified_at, ssl_ready_at, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DomainRow[];
}
