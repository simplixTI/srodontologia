'use server';

import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { assertWithinLimit } from '@/lib/limits/enforcement';
import { INTERNAL_ROLES } from '@/lib/permissions/roles';

export type ActionState = { ok: boolean; error?: string; token?: string };

async function requireOrgAdmin() {
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

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(INTERNAL_ROLES as [string, ...string[]])
});

export async function inviteTeamMemberAction(input: unknown): Promise<ActionState> {
  try {
    const parsed = inviteSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    const { user, profile } = await requireOrgAdmin();

    await assertWithinLimit(profile.organization_id, 'users');

    const admin = createSupabaseAdminClient();

    // Deduplicar convites pendentes p/ mesmo email
    const { data: existing } = await admin
      .from('team_invitations')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('email', parsed.data.email)
      .is('accepted_at', null)
      .is('cancelled_at', null)
      .maybeSingle();
    if (existing) return { ok: false, error: 'Já existe um convite pendente para este e-mail.' };

    const token = `inv_${randomBytes(24).toString('base64url')}`;
    const { error } = await admin.from('team_invitations').insert({
      organization_id: profile.organization_id,
      email: parsed.data.email,
      role: parsed.data.role,
      token,
      invited_by: user.id
    });
    if (error) return { ok: false, error: error.message };

    // TODO: enfileirar job de envio de email com link /accept-invite?token=...
    revalidatePath('/equipe');
    return { ok: true, token };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}

export async function cancelInviteAction(id: string): Promise<ActionState> {
  try {
    const { profile } = await requireOrgAdmin();
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from('team_invitations')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', profile.organization_id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/equipe');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}
