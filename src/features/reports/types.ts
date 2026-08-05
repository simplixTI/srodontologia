export type CaseByStatus = {
  organization_id: string;
  internal_status: string;
  total: number;
  recent_30d: number;
};

export type HealthDistribution = {
  organization_id: string;
  tier: 'high' | 'medium' | 'low' | 'unknown';
  total: number;
};

export type ProductionThroughput = {
  organization_id: string;
  day: string;
  transitions: number;
  rework_transitions: number;
};

export type StageAvgTime = {
  organization_id: string;
  stage_id: string;
  sample_size: number;
  avg_duration_seconds: number;
};

export type TechnicianProductivity = {
  organization_id: string;
  technician_id: string;
  technician_name: string;
  completed_cards: number;
  active_cards: number;
  total_rework: number;
  avg_time_hours: number;
};

export type QcPassRate = {
  organization_id: string;
  day: string;
  total: number;
  passed: number;
  failed: number;
  pass_rate: number | null;
};

export type DeliveriesOnTime = {
  organization_id: string;
  total: number;
  on_time: number;
  late: number;
  on_time_rate: number | null;
};

export type DeliveriesByCarrier = {
  organization_id: string;
  carrier_name: string | null;
  total: number;
  delivered: number;
  open: number;
};

export type RevenueByMonth = {
  organization_id: string;
  month: string;
  income: number;
  expense: number;
  net: number;
};

export type TopExpenseCategory = {
  organization_id: string;
  category: string;
  total: number;
  count: number;
};

export type CommissionPaid = {
  organization_id: string;
  beneficiary_id: string;
  beneficiary_name: string;
  month: string;
  total_paid: number;
};

export type DentistActivity = {
  organization_id: string;
  dentist_id: string;
  dentist_name: string;
  total_cases: number;
  cases_30d: number;
  delivered: number;
};

export type ReportKey =
  | 'cases_by_status'
  | 'health_distribution'
  | 'production_throughput'
  | 'stage_avg_time'
  | 'technician_productivity'
  | 'qc_pass_rate'
  | 'deliveries_on_time'
  | 'deliveries_by_carrier'
  | 'revenue_by_month'
  | 'top_expense_categories'
  | 'commission_paid'
  | 'dentist_activity';

export const REPORT_LABELS: Record<ReportKey, string> = {
  cases_by_status: 'Casos por status',
  health_distribution: 'Distribuição de Health Score',
  production_throughput: 'Throughput diário de produção',
  stage_avg_time: 'Tempo médio por etapa',
  technician_productivity: 'Produtividade por técnico',
  qc_pass_rate: 'Taxa de aprovação QC (diário)',
  deliveries_on_time: 'Entregas no prazo',
  deliveries_by_carrier: 'Entregas por transportadora',
  revenue_by_month: 'Receita/despesa mensal',
  top_expense_categories: 'Top categorias de despesa',
  commission_paid: 'Comissões pagas',
  dentist_activity: 'Atividade por dentista'
};
