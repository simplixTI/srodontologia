import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { renderSimplePdf, type PdfLine } from '../text-pdf';

export async function renderCaseReportPdf(organizationId: string, caseId: string) {
  const admin = createSupabaseAdminClient();
  const { data: c } = await admin
    .from('cases')
    .select('id, case_number, title, priority, internal_status, public_status, clinical_description, material, shade, requested_delivery_date, estimated_delivery_date, actual_delivery_date, created_at')
    .eq('id', caseId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (!c) throw new Error('case not found');

  const { data: summary } = await admin
    .from('case_ai_summaries')
    .select('summary')
    .eq('case_id', caseId)
    .maybeSingle();

  const lines: PdfLine[] = [
    { text: `${c.case_number} · ${c.title}`, bold: true },
    { text: `Status interno: ${c.internal_status}` },
    { text: `Status público: ${c.public_status}` },
    { text: `Prioridade: ${c.priority}` },
    { text: `Solicitado: ${c.requested_delivery_date ?? '-'}` },
    { text: `Previsto: ${c.estimated_delivery_date ?? '-'}` },
    { text: `Entregue: ${c.actual_delivery_date ?? '-'}` }
  ];
  if (c.material || c.shade) lines.push({ text: `Material/Cor: ${c.material ?? '-'} / ${c.shade ?? '-'}` });
  if (c.clinical_description) {
    lines.push({ text: '' });
    lines.push({ text: 'Descrição clínica:', bold: true });
    for (const l of (c.clinical_description ?? '').split(/\r?\n/)) lines.push({ text: l });
  }
  if (summary?.summary) {
    lines.push({ text: '' });
    lines.push({ text: 'Resumo automático:', bold: true });
    for (const l of summary.summary.split(/\r?\n/)) lines.push({ text: l });
  }

  const bytes = renderSimplePdf('SR Digital · Relatório do caso', lines);
  return { bytes, fileName: `caso-${c.case_number}.pdf` };
}
