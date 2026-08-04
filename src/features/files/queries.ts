import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CaseFile = {
  id: string;
  case_id: string;
  checklist_item_id: string | null;
  uploaded_by: string | null;
  file_name: string;
  original_name: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  extension: string | null;
  file_size: number;
  category: string;
  visibility: 'internal' | 'dentist' | 'shared';
  version_number: number;
  metadata: Record<string, unknown>;
  created_at: string;
  archived_at: string | null;
};

export async function listCaseFiles(caseId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('case_files')
    .select('*')
    .eq('case_id', caseId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CaseFile[];
}

/** Counts case_files per checklist_item_id (for the Checklist tab badge). */
export async function countFilesPerChecklistItem(caseId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('case_files')
    .select('checklist_item_id')
    .eq('case_id', caseId)
    .is('archived_at', null);
  if (error) throw new Error(error.message);
  const map = new Map<string, number>();
  for (const row of (data ?? []) as { checklist_item_id: string | null }[]) {
    if (row.checklist_item_id) {
      map.set(row.checklist_item_id, (map.get(row.checklist_item_id) ?? 0) + 1);
    }
  }
  return map;
}
