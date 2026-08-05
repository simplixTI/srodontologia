import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { renderSimplePdf, type PdfLine } from '../text-pdf';

export async function renderQuotePdf(organizationId: string, quoteId: string) {
  const admin = createSupabaseAdminClient();
  const { data: quote } = await admin
    .from('quotes')
    .select('id, quote_number, version_number, status, subtotal, discount, shipping_cost, total, payment_terms, validity_date, estimated_days, public_notes, case_id')
    .eq('id', quoteId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (!quote) throw new Error('quote not found');

  const { data: items } = await admin
    .from('quote_items')
    .select('description, quantity, unit_price, total')
    .eq('quote_id', quoteId)
    .order('sort_order');

  const lines: PdfLine[] = [
    { text: `Orçamento ${quote.quote_number} (v${quote.version_number})`, bold: true },
    { text: `Status: ${quote.status}` },
    { text: `Validade: ${quote.validity_date ?? '-'}` },
    { text: `Prazo estimado: ${quote.estimated_days ?? '-'} dias` },
    { text: '' },
    { text: 'Itens:', bold: true }
  ];
  for (const it of items ?? []) {
    lines.push({ text: `  ${it.quantity}x  ${it.description}  —  ${money(it.total)}` });
  }
  lines.push({ text: '' });
  lines.push({ text: `Subtotal: ${money(quote.subtotal)}` });
  lines.push({ text: `Desconto: ${money(quote.discount)}` });
  lines.push({ text: `Frete: ${money(quote.shipping_cost)}` });
  lines.push({ text: `Total: ${money(quote.total)}`, bold: true });
  if (quote.public_notes) {
    lines.push({ text: '' });
    lines.push({ text: 'Observações:', bold: true });
    lines.push({ text: quote.public_notes });
  }

  const bytes = renderSimplePdf(`SR Digital · Orçamento ${quote.quote_number}`, lines);
  return { bytes, fileName: `orcamento-${quote.quote_number}-v${quote.version_number}.pdf` };
}

function money(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
