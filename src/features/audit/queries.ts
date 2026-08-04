import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AuditLog = {
  id: number;
  organization_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user: { id: string; full_name: string; email: string } | null;
};

export type AuditFilter = {
  entityType?: string;
  action?: string;
  userId?: string;
  limit?: number;
};

export async function listAuditLogs(opts: AuditFilter = {}): Promise<AuditLog[]> {
  const supabase = createSupabaseServerClient();
  let q = supabase
    .from('audit_logs')
    .select(
      'id, organization_id, user_id, action, entity_type, entity_id, previous_data, new_data, ip_address, user_agent, created_at, user:profiles!user_id(id, full_name, email)'
    )
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 100);

  if (opts.entityType) q = q.eq('entity_type', opts.entityType);
  if (opts.action) q = q.eq('action', opts.action);
  if (opts.userId) q = q.eq('user_id', opts.userId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AuditLog[];
}
