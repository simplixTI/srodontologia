'use server';

import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ActionState = { ok: boolean; error?: string; id?: string; token?: string };

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
  return { supabase, profile };
}

const hostnameSchema = z.string()
  .min(4).max(253)
  .regex(/^([a-z0-9-]+\.)+[a-z]{2,}$/i, 'Hostname inválido.');

export async function createDomainAction(hostname: string): Promise<ActionState> {
  try {
    const parsed = hostnameSchema.safeParse(hostname.trim().toLowerCase());
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Hostname inválido.' };
    const { supabase, profile } = await requireOrgAdmin();

    const token = `sr-${randomBytes(16).toString('hex')}`;
    const { data, error } = await supabase
      .from('tenant_domains')
      .insert({
        organization_id: profile.organization_id,
        hostname: parsed.data,
        status: 'pending',
        verification_token: token
      })
      .select('id')
      .single<{ id: string }>();
    if (error) return { ok: false, error: error.message };

    revalidatePath('/dominios');
    return { ok: true, id: data!.id, token };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}

/**
 * Enqueues a real DNS TXT verification job for the domain.
 * The `domain_verify` processor updates `tenant_domains.status` accordingly.
 */
export async function verifyDomainAction(id: string): Promise<ActionState> {
  try {
    const { supabase, profile } = await requireOrgAdmin();
    const { data: owned } = await supabase
      .from('tenant_domains')
      .select('id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .maybeSingle();
    if (!owned) return { ok: false, error: 'Domínio não encontrado.' };

    const { enqueueJob } = await import('@/lib/queue/enqueue');
    await enqueueJob({
      organizationId: profile.organization_id,
      kind: 'domain_verify',
      payload: { domain_id: id },
      priority: 3
    });
    revalidatePath('/dominios');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}

export async function deleteDomainAction(id: string): Promise<ActionState> {
  try {
    const { supabase, profile } = await requireOrgAdmin();
    const { error } = await supabase
      .from('tenant_domains')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/dominios');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}
