import 'server-only';
import type { AiProvider, AiProviderConfig, AiFeatureFlags } from './types';
import { DEFAULT_AI_FEATURES } from './types';
import { createMockProvider } from './providers/mock';
import { createOpenAiProvider } from './providers/openai';
import { createAnthropicProvider } from './providers/anthropic';
import { createGoogleProvider } from './providers/google';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Resolves the AI provider configured for a given organization.
 * Falls back to the mock provider when nothing is configured or
 * when the referenced env var is missing.
 *
 * Never throws for missing config — features must degrade gracefully.
 */
export async function resolveAiProvider(organizationId: string): Promise<{
  provider: AiProvider;
  config: AiProviderConfig;
  features: AiFeatureFlags;
  monthlyTokenBudget: number;
}> {
  const cfg = await loadAiSettings(organizationId);
  const features = { ...DEFAULT_AI_FEATURES, ...(cfg.features ?? {}) };
  const providerConfig: AiProviderConfig = {
    provider: cfg.provider,
    model: cfg.model,
    temperature: Number(cfg.temperature ?? 0.3),
    maxTokens: cfg.max_tokens ?? 1024,
    systemPrompt: cfg.system_prompt,
    apiKey: readApiKeyForProvider(cfg.provider)
  };

  const provider = buildProvider(providerConfig);
  return {
    provider,
    config: providerConfig,
    features,
    monthlyTokenBudget: cfg.monthly_token_budget ?? 1_000_000
  };
}

function buildProvider(cfg: AiProviderConfig): AiProvider {
  if (!cfg.apiKey && cfg.provider !== 'mock') {
    return createMockProvider();
  }
  switch (cfg.provider) {
    case 'openai':
      return createOpenAiProvider(cfg);
    case 'openrouter':
      return createOpenAiProvider({ ...cfg, baseUrl: 'https://openrouter.ai/api/v1' });
    case 'anthropic':
      return createAnthropicProvider(cfg);
    case 'google':
      return createGoogleProvider(cfg);
    case 'mock':
    default:
      return createMockProvider();
  }
}

function readApiKeyForProvider(provider: string): string | null {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY ?? null;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY ?? null;
    case 'google':
      return process.env.GOOGLE_AI_API_KEY ?? null;
    case 'openrouter':
      return process.env.OPENROUTER_API_KEY ?? null;
    default:
      return null;
  }
}

type AiSettingsRow = {
  provider: string;
  model: string;
  temperature: string | number;
  max_tokens: number;
  system_prompt: string | null;
  features: Partial<AiFeatureFlags> | null;
  monthly_token_budget: number;
};

async function loadAiSettings(organizationId: string): Promise<AiSettingsRow> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('ai_settings')
    .select('provider, model, temperature, max_tokens, system_prompt, features, monthly_token_budget')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (data) return data as AiSettingsRow;

  return {
    provider: 'mock',
    model: 'mock-1',
    temperature: 0.3,
    max_tokens: 1024,
    system_prompt: null,
    features: DEFAULT_AI_FEATURES,
    monthly_token_budget: 1_000_000
  };
}
