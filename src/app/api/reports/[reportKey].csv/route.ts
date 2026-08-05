import { NextResponse } from 'next/server';
import { toCsv } from '@/lib/csv';
import {
  listCasesByStatus,
  listCommissionPaid,
  listDeliveriesByCarrier,
  listDeliveriesOnTime,
  listDentistActivity,
  listHealthDistribution,
  listProductionThroughput,
  listQcPassRate,
  listRevenueByMonth,
  listStageAvgTime,
  listTechnicianProductivity,
  listTopExpenseCategories
} from '@/features/reports/queries';
import type { ReportKey } from '@/features/reports/types';

export const dynamic = 'force-dynamic';

const LOADERS: Record<ReportKey, () => Promise<Array<Record<string, unknown>>>> = {
  cases_by_status: () => listCasesByStatus() as Promise<Array<Record<string, unknown>>>,
  health_distribution: () => listHealthDistribution() as Promise<Array<Record<string, unknown>>>,
  production_throughput: () => listProductionThroughput() as Promise<Array<Record<string, unknown>>>,
  stage_avg_time: () => listStageAvgTime() as Promise<Array<Record<string, unknown>>>,
  technician_productivity: () =>
    listTechnicianProductivity() as Promise<Array<Record<string, unknown>>>,
  qc_pass_rate: () => listQcPassRate() as Promise<Array<Record<string, unknown>>>,
  deliveries_on_time: () => listDeliveriesOnTime() as Promise<Array<Record<string, unknown>>>,
  deliveries_by_carrier: () => listDeliveriesByCarrier() as Promise<Array<Record<string, unknown>>>,
  revenue_by_month: () => listRevenueByMonth() as Promise<Array<Record<string, unknown>>>,
  top_expense_categories: () => listTopExpenseCategories() as Promise<Array<Record<string, unknown>>>,
  commission_paid: () => listCommissionPaid() as Promise<Array<Record<string, unknown>>>,
  dentist_activity: () => listDentistActivity() as Promise<Array<Record<string, unknown>>>
};

export async function GET(_req: Request, { params }: { params: { reportKey: string } }) {
  const key = params.reportKey as ReportKey;
  if (!(key in LOADERS)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const rows = await LOADERS[key]();
  const csv = toCsv(rows);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${key}.csv"`
    }
  });
}
