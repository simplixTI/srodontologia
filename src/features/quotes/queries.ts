import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Quote } from './types';

export async function listCaseQuotes(caseId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('case_id', caseId)
    .order('version_number', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Quote[];
}
