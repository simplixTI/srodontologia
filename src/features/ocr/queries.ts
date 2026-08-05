import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type OcrExtractionRow = {
  id: string;
  case_id: string | null;
  case_file_id: string | null;
  target: string;
  status: 'processing' | 'awaiting_review' | 'confirmed' | 'rejected';
  raw_text: string | null;
  fields: Record<string, unknown>;
  confidence: number | null;
  provider: string | null;
  model: string | null;
  reviewed_at: string | null;
  created_at: string;
  case?: { case_number: string; title: string } | null;
};

export async function listOcrExtractions(status?: OcrExtractionRow['status'] | null) {
  const supabase = createSupabaseServerClient();
  let q = supabase
    .from('ocr_extractions')
    .select(
      'id, case_id, case_file_id, target, status, raw_text, fields, confidence, provider, model, reviewed_at, created_at, case:cases(case_number, title)'
    )
    .order('created_at', { ascending: false })
    .limit(50);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OcrExtractionRow[];
}

export async function getOcrExtraction(id: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('ocr_extractions')
    .select(
      'id, case_id, case_file_id, target, status, raw_text, fields, confidence, provider, model, reviewed_at, created_at, case:cases(case_number, title)'
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as unknown as OcrExtractionRow | null;
}
