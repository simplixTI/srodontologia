export type FinCategoryKind = 'revenue' | 'expense';

export const FIN_CATEGORY_KIND_LABELS: Record<FinCategoryKind, string> = {
  revenue: 'Receita',
  expense: 'Despesa'
};

export type PayableStatus = 'pending' | 'scheduled' | 'paid' | 'overdue' | 'cancelled';

export const PAYABLE_STATUS_LABELS: Record<PayableStatus, string> = {
  pending: 'Pendente',
  scheduled: 'Agendado',
  paid: 'Pago',
  overdue: 'Vencido',
  cancelled: 'Cancelado'
};

export const PAYABLE_STATUS_COLORS: Record<PayableStatus, string> = {
  pending: 'border-white/20 text-white/60',
  scheduled: 'border-cyan-400/40 text-cyan-200 bg-cyan-400/10',
  paid: 'border-emerald-400/40 text-emerald-200 bg-emerald-400/10',
  overdue: 'border-red-400/40 text-red-200 bg-red-400/10',
  cancelled: 'border-white/10 text-white/40'
};

export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled';

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  paid: 'Paga',
  cancelled: 'Cancelada'
};

export type TxnKind = 'income' | 'expense';

export type PaymentMethod =
  | 'pix'
  | 'boleto'
  | 'credit_card'
  | 'debit_card'
  | 'bank_transfer'
  | 'cash'
  | 'other';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  boleto: 'Boleto',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  bank_transfer: 'Transferência',
  cash: 'Dinheiro',
  other: 'Outro'
};

export type FinCategory = {
  id: string;
  organization_id: string;
  parent_id: string | null;
  kind: FinCategoryKind;
  name: string;
  code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CostCenter = {
  id: string;
  organization_id: string;
  code: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Payable = {
  id: string;
  organization_id: string;
  supplier_name: string;
  description: string | null;
  category_id: string | null;
  cost_center_id: string | null;
  amount: number;
  due_date: string;
  paid_at: string | null;
  paid_amount: number | null;
  method: PaymentMethod | null;
  status: PayableStatus;
  external_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PayableWithMeta = Payable & {
  category_name: string | null;
  cost_center_name: string | null;
};

export type Commission = {
  id: string;
  organization_id: string;
  beneficiary_id: string;
  invoice_id: string | null;
  case_id: string | null;
  base_amount: number;
  percentage: number;
  amount: number;
  reference_month: string | null;
  status: CommissionStatus;
  approved_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CommissionWithMeta = Commission & {
  beneficiary_name: string | null;
  invoice_number: string | null;
};

export type FinTransaction = {
  id: string;
  organization_id: string;
  kind: TxnKind;
  amount: number;
  txn_date: string;
  category_id: string | null;
  cost_center_id: string | null;
  method: PaymentMethod | null;
  source_type: string | null;
  source_id: string | null;
  description: string | null;
  notes: string | null;
  created_at: string;
};

export type FinanceKpis = {
  organization_id: string;
  income_30d: number;
  expense_30d: number;
  income_mtd: number;
  expense_mtd: number;
};

export type CashFlowPoint = {
  organization_id: string;
  txn_date: string;
  income: number;
  expense: number;
  net: number;
};

export type DreRow = {
  organization_id: string;
  month: string;
  kind: TxnKind;
  category: string;
  total: number;
};

export type PayablesSummary = {
  organization_id: string;
  total_count: number;
  overdue_count: number;
  total_amount: number;
  overdue_amount: number;
};
