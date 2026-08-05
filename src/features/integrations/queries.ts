import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DEFAULT_AI_FEATURES, type AiFeatureFlags } from '@/lib/ai/types';

export type IntegrationRow = {
  id: string;
  kind: 'ai_provider' | 'ocr_provider' | 'cpf_provider' | 'whatsapp' | 'email' | 'webhook';
  provider: string;
  enabled: boolean;
  config: Record<string, unknown>;
  secret_ref: string | null;
};

export type AiSettingsRow = {
  provider: string;
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string | null;
  monthly_token_budget: number;
  features: AiFeatureFlags;
};

export async function listIntegrations(): Promise<IntegrationRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('integration_settings')
    .select('id, kind, provider, enabled, config, secret_ref')
    .order('kind');
  if (error) throw new Error(error.message);
  return (data ?? []) as IntegrationRow[];
}

export async function getAiSettings(): Promise<AiSettingsRow> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('ai_settings')
    .select('provider, model, temperature, max_tokens, system_prompt, monthly_token_budget, features')
    .maybeSingle();
  if (!data) {
    return {
      provider: 'mock',
      model: 'mock-1',
      temperature: 0.3,
      max_tokens: 1024,
      system_prompt: null,
      monthly_token_budget: 1_000_000,
      features: DEFAULT_AI_FEATURES
    };
  }
  return {
    provider: data.provider as string,
    model: data.model as string,
    temperature: Number(data.temperature),
    max_tokens: data.max_tokens as number,
    system_prompt: (data.system_prompt as string | null) ?? null,
    monthly_token_budget: (data.monthly_token_budget as number) ?? 1_000_000,
    features: { ...DEFAULT_AI_FEATURES, ...(data.features as Partial<AiFeatureFlags>) }
  };
}
