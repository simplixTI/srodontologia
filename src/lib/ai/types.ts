/**
 * Domain-agnostic AI abstractions.
 *
 * The rest of the codebase depends ONLY on these types + `resolveAiProvider()`.
 * No feature should import from `providers/openai` etc. directly.
 */

export type AiRole = 'system' | 'user' | 'assistant';

export type AiMessage = {
  role: AiRole;
  content: string;
};

export type AiCompletionRequest = {
  messages: AiMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Free-form feature label for usage tracking / cost attribution. */
  feature: string;
  /** Optional case id for cost attribution. */
  caseId?: string | null;
  /** Optional user id for cost attribution. */
  userId?: string | null;
  /** Signal for cancellation / timeout. */
  signal?: AbortSignal;
};

export type AiUsage = {
  inputTokens: number;
  outputTokens: number;
  costEstimate?: number;
};

export type AiCompletionResponse = {
  text: string;
  usage: AiUsage;
  model: string;
  provider: string;
  latencyMs: number;
  finishReason?: 'stop' | 'length' | 'content_filter' | 'unknown';
};

export type AiProvider = {
  id: string;
  displayName: string;
  complete(req: AiCompletionRequest): Promise<AiCompletionResponse>;
};

export type AiProviderConfig = {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string | null;
  apiKey?: string | null;
};

export type AiFeatureFlags = {
  case_summary: boolean;
  lab_assistant: boolean;
  dentist_assistant: boolean;
  image_analysis: boolean;
  prazo_prediction: boolean;
  smart_search: boolean;
};

export const DEFAULT_AI_FEATURES: AiFeatureFlags = {
  case_summary: true,
  lab_assistant: true,
  dentist_assistant: true,
  image_analysis: false,
  prazo_prediction: true,
  smart_search: true
};
