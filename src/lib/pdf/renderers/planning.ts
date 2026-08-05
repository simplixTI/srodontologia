import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { renderSimplePdf, type PdfLine } from '../text-pdf';

export async function renderPlanningPdf(organizationId: string, planningId: string) {
  const admin = createSupabaseAdminClient();
  const { data: plan } = await admin
    .from('planning_versions')
    .select('id, version_number, status, technical_description, created_at, case_id')
    .eq('id', planningId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (!plan) throw new Error('planning not found');

  const lines: PdfLine[] = [
    { text: `Planejamento técnico · v${plan.version_number}`, bold: true },
    { text: `Status: ${plan.status}` },
    { text: `Criado em: ${new Date(plan.created_at).toLocaleString('pt-BR')}` },
    { text: '' },
    { text: 'Descrição técnica:', bold: true }
  ];
  const desc = (plan.technical_description ?? '').split(/\r?\n/);
  for (const l of desc) lines.push({ text: l });

  const bytes = renderSimplePdf('SR Digital · Planejamento técnico', lines);
  return { bytes, fileName: `planejamento-v${plan.version_number}.pdf` };
}
