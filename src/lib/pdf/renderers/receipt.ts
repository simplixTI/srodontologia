import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { renderSimplePdf, type PdfLine } from '../text-pdf';

export async function renderReceiptPdf(organizationId: string, deliveryId: string) {
  const admin = createSupabaseAdminClient();
  const { data: d } = await admin
    .from('deliveries')
    .select('id, status, method, carrier, driver_name, tracking_code, recipient_name, delivered_at, notes, confirmation_data, case_id')
    .eq('id', deliveryId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (!d) throw new Error('delivery not found');

  const lines: PdfLine[] = [
    { text: `Comprovante de entrega`, bold: true },
    { text: `Status: ${d.status}` },
    { text: `Método: ${d.method ?? '-'}` },
    { text: `Transportadora: ${d.carrier ?? '-'}` },
    { text: `Motorista: ${d.driver_name ?? '-'}` },
    { text: `Rastreio: ${d.tracking_code ?? '-'}` },
    { text: `Destinatário: ${d.recipient_name ?? '-'}` },
    { text: `Entregue em: ${d.delivered_at ? new Date(d.delivered_at).toLocaleString('pt-BR') : '-'}` }
  ];
  if (d.notes) {
    lines.push({ text: '' });
    lines.push({ text: 'Observações:', bold: true });
    lines.push({ text: d.notes });
  }

  const bytes = renderSimplePdf('SR Digital · Comprovante de entrega', lines);
  return { bytes, fileName: `comprovante-${deliveryId.slice(0, 8)}.pdf` };
}
