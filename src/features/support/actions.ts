'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ActionState = { ok: boolean; error?: string; id?: string };

async function requireInternal() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string; role: string }>();
  if (!profile) throw new Error('Perfil não encontrado.');
  return { supabase, user, profile };
}

const openSchema = z.object({
  subject: z.string().min(3).max(200),
  description: z.string().max(5000).optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium')
});

export async function openSupportTicketAction(input: unknown): Promise<ActionState> {
  try {
    const parsed = openSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    const { supabase, user, profile } = await requireInternal();

    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        organization_id: profile.organization_id,
        subject: parsed.data.subject,
        description: parsed.data.description ?? null,
        priority: parsed.data.priority,
        created_by: user.id
      })
      .select('id')
      .single<{ id: string }>();
    if (error) return { ok: false, error: error.message };

    revalidatePath('/suporte');
    return { ok: true, id: data!.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}

const messageSchema = z.object({
  ticket_id: z.string().uuid(),
  body: z.string().min(1).max(5000)
});

export async function postSupportMessageAction(input: unknown): Promise<ActionState> {
  try {
    const parsed = messageSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: 'Dados inválidos.' };
    const { supabase, user } = await requireInternal();

    const { error } = await supabase.from('support_ticket_messages').insert({
      ticket_id: parsed.data.ticket_id,
      from_user_id: user.id,
      body: parsed.data.body,
      is_internal: false
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/suporte/${parsed.data.ticket_id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}
