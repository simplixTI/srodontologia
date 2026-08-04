import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Delivery } from './types';

export async function listCaseDeliveries(caseId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Delivery[];
}
