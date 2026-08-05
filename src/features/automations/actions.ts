'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DOMAIN_EVENT_TYPES } from '@/lib/events/types';

export type ActionState = { ok: boolean; error?: string; id?: string };

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

const ruleSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable(),
  trigger_event: z.enum(DOMAIN_EVENT_TYPES),
  conditions: z.array(z.record(z.unknown())).default([]),
  actions: z.array(
    z.object({
      type: z.enum([
        'notify_admins',
        'notify_case_owner',
        'send_email',
        'send_whatsapp',
        'enqueue_webhook',
        'update_case_status',
        'enqueue_pdf',
        'enqueue_summary',
        'log_only'
      ]),
      params: z.record(z.unknown()).optional()
    })
  ).min(1),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(1).max(10).default(5)
});

export async function saveAutomationRuleAction(id: string | null, input: unknown): Promise<ActionState> {
  try {
    const parsed = ruleSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    const { supabase, user, profile } = await requireAdmin();

    if (id) {
      const { error } = await supabase
        .from('automation_rules')
        .update({
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          trigger_event: parsed.data.trigger_event,
          conditions: parsed.data.conditions,
          actions: parsed.data.actions,
          enabled: parsed.data.enabled,
          priority: parsed.data.priority
        })
        .eq('id', id)
        .eq('organization_id', profile.organization_id);
      if (error) return { ok: false, error: error.message };
      revalidatePath('/automacoes');
      return { ok: true, id };
    }

    const { data, error } = await supabase
      .from('automation_rules')
      .insert({
        organization_id: profile.organization_id,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        trigger_event: parsed.data.trigger_event,
        conditions: parsed.data.conditions,
        actions: parsed.data.actions,
        enabled: parsed.data.enabled,
        priority: parsed.data.priority,
        created_by: user.id
      })
      .select('id')
      .single<{ id: string }>();
    if (error) return { ok: false, error: error.message };
    revalidatePath('/automacoes');
    return { ok: true, id: data!.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha ao salvar regra.' };
  }
}

export async function toggleAutomationRuleAction(id: string, enabled: boolean): Promise<ActionState> {
  try {
    const { supabase, profile } = await requireAdmin();
    const { error } = await supabase
      .from('automation_rules')
      .update({ enabled })
      .eq('id', id)
      .eq('organization_id', profile.organization_id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/automacoes');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha ao alternar regra.' };
  }
}

export async function deleteAutomationRuleAction(id: string): Promise<ActionState> {
  try {
    const { supabase, profile } = await requireAdmin();
    const { error } = await supabase
      .from('automation_rules')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/automacoes');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha ao remover regra.' };
  }
}
