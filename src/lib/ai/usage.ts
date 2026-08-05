import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { AiCompletionResponse } from './types';

export type AiUsageEntry = {
  organizationId: string;
  feature: string;
  response: AiCompletionResponse;
  caseId?: string | null;
  userId?: string | null;
};

/**
 * Persist a single AI call for cost + rate-limit accounting.
 * Never throws (best-effort telemetry).
 */
export async function logAiUsage(entry: AiUsageEntry): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from('ai_usage_log').insert({
      organization_id: entry.organizationId,
      provider: entry.response.provider,
      model: entry.response.model,
      feature: entry.feature,
      input_tokens: entry.response.usage.inputTokens,
      output_tokens: entry.response.usage.outputTokens,
      latency_ms: entry.response.latencyMs,
      case_id: entry.caseId ?? null,
      user_id: entry.userId ?? null,
      cost_estimate: entry.response.usage.costEstimate ?? null
    });
  } catch {
    // telemetry-only, no throw
  }
}

/**
 * Fast token usage check for a rolling monthly budget.
 * Returns { used, budget, remaining } — features can degrade if exceeded.
 */
export async function getMonthlyAiUsage(organizationId: string, budget: number): Promise<{
  used: number;
  budget: number;
  remaining: number;
  exceeded: boolean;
}> {
  try {
    const admin = createSupabaseAdminClient();
    const since = new Date();
    since.setUTCDate(1);
    since.setUTCHours(0, 0, 0, 0);

    const { data } = await admin
      .from('ai_usage_log')
      .select('input_tokens, output_tokens')
      .eq('organization_id', organizationId)
      .gte('created_at', since.toISOString());

    const used = (data ?? []).reduce(
      (acc: number, r: { input_tokens: number; output_tokens: number }) =>
        acc + (r.input_tokens ?? 0) + (r.output_tokens ?? 0),
      0
    );
    return { used, budget, remaining: Math.max(0, budget - used), exceeded: used >= budget };
  } catch {
    return { used: 0, budget, remaining: budget, exceeded: false };
  }
}
