import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  CaseByStatus,
  CommissionPaid,
  DeliveriesByCarrier,
  DeliveriesOnTime,
  DentistActivity,
  HealthDistribution,
  ProductionThroughput,
  QcPassRate,
  RevenueByMonth,
  StageAvgTime,
  TechnicianProductivity,
  TopExpenseCategory
} from './types';

async function query<T>(view: string): Promise<T[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from(view).select('*');
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export const listCasesByStatus = () => query<CaseByStatus>('v_report_cases_by_status');
export const listHealthDistribution = () => query<HealthDistribution>('v_report_cases_health_distribution');
export const listProductionThroughput = () =>
  query<ProductionThroughput>('v_report_production_throughput_daily');
export const listStageAvgTime = () => query<StageAvgTime>('v_report_production_stage_avg_time');
export const listTechnicianProductivity = () =>
  query<TechnicianProductivity>('v_report_technician_productivity');
export const listQcPassRate = () => query<QcPassRate>('v_report_qc_pass_rate_daily');
export const listDeliveriesOnTime = () =>
  query<DeliveriesOnTime>('v_report_deliveries_on_time');
export const listDeliveriesByCarrier = () =>
  query<DeliveriesByCarrier>('v_report_deliveries_by_carrier');
export const listRevenueByMonth = () => query<RevenueByMonth>('v_report_finance_revenue_by_month');
export const listTopExpenseCategories = () =>
  query<TopExpenseCategory>('v_report_finance_top_expense_categories');
export const listCommissionPaid = () => query<CommissionPaid>('v_report_finance_commission_paid');
export const listDentistActivity = () => query<DentistActivity>('v_report_dentist_activity');
