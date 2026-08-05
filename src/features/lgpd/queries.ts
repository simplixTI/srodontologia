import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ExportRequestRow = {
  id: string;
  scope: string;
  scope_id: string | null;
  status: string;
  storage_path: string | null;
  file_size: number | null;
  requested_at: string;
  completed_at: string | null;
  expires_at: string | null;
};

export type DeletionRequestRow = {
  id: string;
  scope: string;
  scope_id: string | null;
  reason: string | null;
  status: string;
  scheduled_at: string | null;
  executed_at: string | null;
  cancelled_at: string | null;
  requested_at: string;
};

export async function listExportRequests(): Promise<ExportRequestRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('data_export_requests')
    .select('id, scope, scope_id, status, storage_path, file_size, requested_at, completed_at, expires_at')
    .order('requested_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ExportRequestRow[];
}

export async function listDeletionRequests(): Promise<DeletionRequestRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('data_deletion_requests')
    .select('id, scope, scope_id, reason, status, scheduled_at, executed_at, cancelled_at, requested_at')
    .order('requested_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DeletionRequestRow[];
}
