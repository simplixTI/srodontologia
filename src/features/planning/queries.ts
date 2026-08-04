import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { PlanningVersion } from './types';

export async function listCasePlanning(caseId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('planning_versions')
    .select('*')
    .eq('case_id', caseId)
    .order('version_number', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PlanningVersion[];
}
