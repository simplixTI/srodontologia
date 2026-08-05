import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { JobProcessor } from '../types';
import { runOcrOnFile } from '@/lib/ocr/runner';

type OcrPayload = {
  case_file_id: string;
  target: 'document' | 'clinical_form';
};

export const processOcrDocument: JobProcessor<OcrPayload> = async (job) => {
  const admin = createSupabaseAdminClient();
  const { case_file_id, target } = job.payload;
  if (!case_file_id) throw new Error('ocr_document missing case_file_id');

  const { data: file } = await admin
    .from('case_files')
    .select('id, case_id, storage_path, mime_type, file_name, original_name, extension, organization_id')
    .eq('id', case_file_id)
    .maybeSingle();
  if (!file) throw new Error('file not found');

  const result = await runOcrOnFile({
    organizationId: file.organization_id ?? job.organization_id,
    caseId: file.case_id,
    file,
    target: target ?? 'document'
  });

  await admin.from('ocr_extractions').upsert({
    case_file_id: file.id,
    case_id: file.case_id,
    organization_id: file.organization_id ?? job.organization_id,
    target: target ?? 'document',
    status: 'awaiting_review',
    raw_text: result.rawText,
    fields: result.fields,
    confidence: result.confidence,
    provider: result.provider,
    model: result.model
  });

  return { extracted: true, fieldCount: Object.keys(result.fields).length };
};
