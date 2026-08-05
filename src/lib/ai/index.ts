import 'server-only';
import type { AiMessage, AiCompletionResponse, AiFeatureFlags } from './types';
import { resolveAiProvider } from './registry';
import { logAiUsage, getMonthlyAiUsage } from './usage';
import { buildSystemPrompt } from './prompt-safety';

/**
 * Public entry point for any feature that needs a text completion.
 *
 * Handles:
 *  - resolving the provider from org settings
 *  - enforcing the monthly token budget
 *  - injecting a hardened system prompt
 *  - persisting usage log for cost + rate-limit accounting
 *
 * Never throws for expected states — falls back to a graceful message
 * so the calling feature can keep working.
 */
export async function runAi(opts: {
  organizationId: string;
  feature: keyof AiFeatureFlags;
  role: string;
  guardrails?: string[];
  userMessages: AiMessage[];
  caseId?: string | null;
  userId?: string | null;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<AiCompletionResponse & { degraded?: boolean; reason?: string }> {
  const resolved = await resolveAiProvider(opts.organizationId);

  if (!resolved.features[opts.feature]) {
    return {
      text: 'Recurso desativado para esta organização.',
      usage: { inputTokens: 0, outputTokens: 0 },
      model: resolved.config.model,
      provider: resolved.provider.id,
      latencyMs: 0,
      degraded: true,
      reason: 'feature_disabled'
    };
  }

  const usage = await getMonthlyAiUsage(opts.organizationId, resolved.monthlyTokenBudget);
  if (usage.exceeded) {
    return {
      text: 'Cota mensal de IA atingida. Contate o administrador da organização.',
      usage: { inputTokens: 0, outputTokens: 0 },
      model: resolved.config.model,
      provider: resolved.provider.id,
      latencyMs: 0,
      degraded: true,
      reason: 'budget_exceeded'
    };
  }

  const systemPrompt = buildSystemPrompt(
    resolved.config.systemPrompt || opts.role,
    opts.guardrails
  );
  const messages: AiMessage[] = [{ role: 'system', content: systemPrompt }, ...opts.userMessages];

  try {
    const res = await resolved.provider.complete({
      messages,
      model: resolved.config.model,
      temperature: opts.temperature ?? resolved.config.temperature,
      maxTokens: opts.maxTokens ?? resolved.config.maxTokens,
      feature: opts.feature,
      caseId: opts.caseId ?? null,
      userId: opts.userId ?? null,
      signal: opts.signal
    });
    await logAiUsage({
      organizationId: opts.organizationId,
      feature: opts.feature,
      response: res,
      caseId: opts.caseId,
      userId: opts.userId
    });
    return res;
  } catch (err) {
    return {
      text: 'Não foi possível gerar a resposta agora. Tente novamente em instantes.',
      usage: { inputTokens: 0, outputTokens: 0 },
      model: resolved.config.model,
      provider: resolved.provider.id,
      latencyMs: 0,
      degraded: true,
      reason: err instanceof Error ? err.message : 'unknown_error'
    };
  }
}

export type { AiMessage, AiCompletionResponse, AiFeatureFlags } from './types';
export { sanitizeUserText } from './prompt-safety';
