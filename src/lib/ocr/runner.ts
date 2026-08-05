import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { loadIntegration, readIntegrationSecret } from '@/lib/integrations/config';
import { createMockOcrProvider } from './providers/mock';
import type { OcrProvider, OcrRunInput, OcrRunResult } from './types';

const CASE_FILES_BUCKET = 'case-files';

/**
 * Executes OCR against a stored case file. Provider selection follows
 * integration_settings; falls back to Mock when nothing is configured.
 */
export async function runOcrOnFile(input: OcrRunInput): Promise<OcrRunResult> {
  const admin = createSupabaseAdminClient();

  // Download the file to a buffer we can hand to the provider.
  const { data: blob, error } = await admin.storage
    .from(CASE_FILES_BUCKET)
    .download(input.file.storage_path);
  if (error || !blob) throw new Error(`failed to download OCR source: ${error?.message ?? 'no blob'}`);
  const buf = await blob.arrayBuffer();

  const provider = await resolveOcrProvider(input.organizationId);
  return provider.extract(input, { fileBuffer: buf });
}

async function resolveOcrProvider(organizationId: string): Promise<OcrProvider> {
  const integration = await loadIntegration(organizationId, 'ocr_provider');
  if (!integration || !integration.enabled) return createMockOcrProvider();
  const secret = readIntegrationSecret(integration);
  if (!secret) return createMockOcrProvider();

  // Real providers (Google Vision, AWS Textract, Azure Document Intelligence)
  // will be added here. For now we return mock so features work end-to-end.
  return createMockOcrProvider();
}
