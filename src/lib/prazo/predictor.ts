import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type PrazoPrediction = {
  estimatedDays: number;
  estimatedDeliveryDate: string; // ISO date
  confidence: number;            // 0..1
  source: 'history' | 'case_type_default' | 'fallback';
  sampleSize: number;
};

/**
 * Statistical lead time predictor. Uses only historical data — no LLM.
 *
 * Strategy (best to worst):
 *   1) mean delivery time of the last 20 completed cases of same case_type
 *      that belong to same organization; require sampleSize >= 5.
 *   2) case_types.default_lead_time_days snapshot (if column exists).
 *   3) global fallback of 10 business days.
 *
 * Returns a date (submitted_at + estimatedDays) or (now + estimatedDays).
 */
export async function predictLeadTimeDays(
  organizationId: string,
  caseId: string
): Promise<PrazoPrediction> {
  const admin = createSupabaseAdminClient();

  const { data: theCase } = await admin
    .from('cases')
    .select('id, case_type_id, submitted_at, priority')
    .eq('id', caseId)
    .maybeSingle();
  if (!theCase) return fallback();

  const submittedAt = theCase.submitted_at ? new Date(theCase.submitted_at) : new Date();

  const { data: history } = await admin
    .from('cases')
    .select('submitted_at, actual_delivery_date')
    .eq('organization_id', organizationId)
    .eq('case_type_id', theCase.case_type_id)
    .not('actual_delivery_date', 'is', null)
    .not('submitted_at', 'is', null)
    .order('actual_delivery_date', { ascending: false })
    .limit(20);

  const samples = (history ?? [])
    .map((r) => diffDays(r.submitted_at as string, r.actual_delivery_date as string))
    .filter((n) => n > 0 && n < 90);

  if (samples.length >= 5) {
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const std = stddev(samples, mean);
    const rounded = Math.max(2, Math.round(mean));
    const confidence = clamp(1 - std / (mean || 1), 0.35, 0.95);
    return {
      estimatedDays: rounded,
      estimatedDeliveryDate: addDays(submittedAt, rounded),
      confidence,
      source: 'history',
      sampleSize: samples.length
    };
  }

  const defaultDays = await defaultLeadForCaseType(theCase.case_type_id);
  if (defaultDays) {
    return {
      estimatedDays: defaultDays,
      estimatedDeliveryDate: addDays(submittedAt, defaultDays),
      confidence: 0.5,
      source: 'case_type_default',
      sampleSize: samples.length
    };
  }
  return fallback(submittedAt);
}

async function defaultLeadForCaseType(caseTypeId: string | null): Promise<number | null> {
  if (!caseTypeId) return null;
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('case_types')
    .select('default_lead_time_days')
    .eq('id', caseTypeId)
    .maybeSingle();
  const days = (data as { default_lead_time_days?: number } | null)?.default_lead_time_days;
  return typeof days === 'number' && days > 0 ? days : null;
}

function diffDays(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function stddev(nums: number[], mean: number): number {
  if (nums.length <= 1) return 0;
  const v = nums.reduce((s, n) => s + (n - mean) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(v);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function addDays(date: Date, n: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function fallback(base?: Date): PrazoPrediction {
  const start = base ?? new Date();
  return {
    estimatedDays: 10,
    estimatedDeliveryDate: addDays(start, 10),
    confidence: 0.3,
    source: 'fallback',
    sampleSize: 0
  };
}
