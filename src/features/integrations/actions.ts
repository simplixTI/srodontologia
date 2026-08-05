'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ActionState = { ok: boolean; error?: string };

async function requireAdmin() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string; role: string }>();
  if (!profile) throw new Error('Perfil não encontrado.');
  if (!['super_admin', 'admin'].includes(profile.role)) throw new Error('Apenas administradores.');
  return { supabase, user, profile };
}

const integrationSchema = z.object({
  kind: z.enum(['ai_provider', 'ocr_provider', 'cpf_provider', 'whatsapp', 'email', 'webhook']),
  provider: z.string().min(1).max(80),
  enabled: z.boolean().default(false),
  config: z.record(z.unknown()).default({}),
  secret_ref: z.string().max(120).optional().nullable()
});

export async function saveIntegrationAction(input: unknown): Promise<ActionState> {
  try {
    const parsed = integrationSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    const { supabase, user, profile } = await requireAdmin();

    const { error } = await supabase.from('integration_settings').upsert(
      {
        organization_id: profile.organization_id,
        kind: parsed.data.kind,
        provider: parsed.data.provider,
        enabled: parsed.data.enabled,
        config: parsed.data.config,
        secret_ref: parsed.data.secret_ref ?? null,
        updated_by: user.id
      },
      { onConflict: 'organization_id,kind' }
    );
    if (error) return { ok: false, error: error.message };
    revalidatePath('/integracoes');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha ao salvar integração.' };
  }
}

const aiSettingsSchema = z.object({
  provider: z.enum(['mock', 'openai', 'anthropic', 'google', 'openrouter']),
  model: z.string().min(1).max(80),
  temperature: z.number().min(0).max(2),
  max_tokens: z.number().int().min(64).max(8192),
  system_prompt: z.string().max(4000).optional().nullable(),
  monthly_token_budget: z.number().int().min(0),
  features: z.object({
    case_summary: z.boolean(),
    lab_assistant: z.boolean(),
    dentist_assistant: z.boolean(),
    image_analysis: z.boolean(),
    prazo_prediction: z.boolean(),
    smart_search: z.boolean()
  })
});

export async function saveAiSettingsAction(input: unknown): Promise<ActionState> {
  try {
    const parsed = aiSettingsSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    const { supabase, user, profile } = await requireAdmin();

    const { error } = await supabase.from('ai_settings').upsert({
      organization_id: profile.organization_id,
      provider: parsed.data.provider,
      model: parsed.data.model,
      temperature: parsed.data.temperature,
      max_tokens: parsed.data.max_tokens,
      system_prompt: parsed.data.system_prompt ?? null,
      monthly_token_budget: parsed.data.monthly_token_budget,
      features: parsed.data.features,
      updated_by: user.id
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath('/integracoes');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha ao salvar configuração de IA.' };
  }
}
