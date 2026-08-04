export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'changes_requested';

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Rascunho',
  sent: 'Enviado',
  approved: 'Aprovado',
  rejected: 'Recusado',
  expired: 'Expirado',
  changes_requested: 'Alteração solicitada'
};

export type Quote = {
  id: string;
  case_id: string;
  quote_number: string;
  version_number: number;
  status: QuoteStatus;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  total: number;
  payment_terms: string | null;
  validity_date: string | null;
  estimated_days: number | null;
  public_notes: string | null;
  sent_at: string | null;
  approved_at: string | null;
  created_at: string;
};
