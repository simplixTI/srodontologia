import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CaseMessage = {
  id: string;
  case_id: string;
  sender_id: string;
  message: string;
  visibility: 'internal' | 'dentist';
  reply_to_id: string | null;
  edited_at: string | null;
  created_at: string;
  sender: { id: string; full_name: string; role: string } | null;
};

export async function listCaseMessages(caseId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('case_messages')
    .select('id, case_id, sender_id, message, visibility, reply_to_id, edited_at, created_at, sender:profiles!sender_id(id, full_name, role)')
    .eq('case_id', caseId)
    .is('archived_at', null)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CaseMessage[];
}
