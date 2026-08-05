import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CaseAiSummary = {
  case_id: string;
  summary: string;
  pending: string[] | null;
  next_steps: string[] | null;
  model: string | null;
  generated_at: string;
};

export async function getCaseAiSummary(caseId: string): Promise<CaseAiSummary | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('case_ai_summaries')
    .select('case_id, summary, pending, next_steps, model, generated_at')
    .eq('case_id', caseId)
    .maybeSingle();
  return (data ?? null) as CaseAiSummary | null;
}
