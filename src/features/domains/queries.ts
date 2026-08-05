import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type DomainRow = {
  id: string;
  organization_id: string;
  hostname: string;
  status: 'pending' | 'verified' | 'active' | 'error';
  verification_token: string;
  verified_at: string | null;
  ssl_ready_at: string | null;
  created_at: string;
};

/**
 * Lista todos os domínios visíveis ao caller.
 *  • Platform admin: vê todos.
 *  • Office admin: vê apenas os do próprio tenant (leitura informativa).
 * RLS em tenant_domains (migration 0051) enforce o corte.
 */
export async function listDomains(opts?: { organizationId?: string }): Promise<DomainRow[]> {
  const supabase = createSupabaseServerClient();
  let q = supabase
    .from('tenant_domains')
    .select('id, organization_id, hostname, status, verification_token, verified_at, ssl_ready_at, created_at')
    .order('created_at', { ascending: false });
  if (opts?.organizationId) q = q.eq('organization_id', opts.organizationId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as DomainRow[];
}
