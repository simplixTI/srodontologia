import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { JobKind } from '@/lib/queue/types';
import { renderQuotePdf } from './renderers/quote';
import { renderPlanningPdf } from './renderers/planning';
import { renderReceiptPdf } from './renderers/receipt';
import { renderCaseReportPdf } from './renderers/case-report';

const PDF_BUCKET = 'pdf-documents';

export type PdfGenerateInput = {
  organizationId: string;
  kind: JobKind;
  payload: {
    case_id?: string;
    quote_id?: string;
    planning_id?: string;
    delivery_id?: string;
  };
};

export type PdfGenerateResult = {
  storagePath: string;
  size: number;
};

/**
 * Generate + persist a PDF. Each renderer returns raw bytes; we upload to
 * private storage and index the file in `pdf_documents`.
 */
export async function generateDocumentPdf(input: PdfGenerateInput): Promise<PdfGenerateResult> {
  const admin = createSupabaseAdminClient();
  const { organizationId, kind, payload } = input;

  const rendered = await renderByKind(kind, organizationId, payload);
  const fileName = rendered.fileName;
  const storagePath = `${organizationId}/${kind}/${Date.now()}-${fileName}`;

  const { error: uploadErr } = await admin.storage
    .from(PDF_BUCKET)
    .upload(storagePath, rendered.bytes, {
      contentType: 'application/pdf',
      cacheControl: '3600',
      upsert: false
    });
  if (uploadErr) throw new Error(`pdf upload failed: ${uploadErr.message}`);

  await admin.from('pdf_documents').insert({
    organization_id: organizationId,
    case_id: payload.case_id ?? null,
    kind: kind.replace('pdf_generate_', ''),
    reference_id: payload.quote_id ?? payload.planning_id ?? payload.delivery_id ?? null,
    storage_bucket: PDF_BUCKET,
    storage_path: storagePath,
    file_name: fileName,
    file_size: rendered.bytes.byteLength
  });

  return { storagePath, size: rendered.bytes.byteLength };
}

async function renderByKind(
  kind: JobKind,
  organizationId: string,
  payload: PdfGenerateInput['payload']
): Promise<{ bytes: Uint8Array; fileName: string }> {
  switch (kind) {
    case 'pdf_generate_quote':
      return renderQuotePdf(organizationId, payload.quote_id!);
    case 'pdf_generate_planning':
      return renderPlanningPdf(organizationId, payload.planning_id!);
    case 'pdf_generate_receipt':
      return renderReceiptPdf(organizationId, payload.delivery_id!);
    case 'pdf_generate_case_report':
      return renderCaseReportPdf(organizationId, payload.case_id!);
    default:
      throw new Error(`unknown pdf kind ${kind}`);
  }
}
