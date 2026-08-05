import 'server-only';
import type { JobProcessor } from '../types';
import { generateDocumentPdf } from '@/lib/pdf/generator';

type PdfPayload = {
  case_id?: string;
  quote_id?: string;
  planning_id?: string;
  delivery_id?: string;
};

export const processPdfGenerate: JobProcessor<PdfPayload> = async (job) => {
  const result = await generateDocumentPdf({
    organizationId: job.organization_id,
    kind: job.kind,
    payload: job.payload
  });
  return { storage_path: result.storagePath, size: result.size };
};
