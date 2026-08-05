'use server';

import { revalidatePath } from 'next/cache';
import { randomBytes, createHash } from 'crypto';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CreateKeyResult =
  | { ok: true; token: string; prefix: string; id: string }
  | { ok: false; error: string };

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

const createSchema = z.object({
  name: z.string().min(2).max(80),
  scopes: z.array(z.string().min(1)).min(1)
});

/**
 * Creates a new API key. The RAW TOKEN is returned only once — client MUST
 * store it immediately. DB keeps only sha256(token).
 */
export async function createApiKeyAction(input: unknown): Promise<CreateKeyResult> {
  try {
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    const { supabase, user, profile } = await requireAdmin();

    const random = randomBytes(24).toString('base64url');
    const token = `sk_live_${random}`;
    const hash = createHash('sha256').update(token).digest('hex');
    const prefix = token.slice(0, 12);

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        organization_id: profile.organization_id,
        name: parsed.data.name,
        key_prefix: prefix,
        key_hash: hash,
        scopes: parsed.data.scopes,
        created_by: user.id
      })
      .select('id')
      .single<{ id: string }>();
    if (error) return { ok: false, error: error.message };

    revalidatePath('/api-tokens');
    return { ok: true, token, prefix, id: data!.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha ao criar chave.' };
  }
}

export async function revokeApiKeyAction(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { supabase, profile } = await requireAdmin();
    const { error } = await supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', profile.organization_id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/api-tokens');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha ao revogar chave.' };
  }
}
