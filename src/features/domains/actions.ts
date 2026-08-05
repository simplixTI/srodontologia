'use server';

import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requirePlatformUser } from '@/lib/permissions/platform';

export type ActionState = { ok: boolean; error?: string; id?: string; token?: string };

/**
 * Guard: apenas platform admin (Bruno / support) pode escrever em
 * tenant_domains. A RLS em migration 0051 confirma via
 * is_platform_admin() no banco. Este guard aplica a mesma regra
 * já na server action, para evitar chamada desnecessária ao DB.
 */
async function requirePlatform() {
  await requirePlatformUser();
  const supabase = createSupabaseServerClient();
  return { supabase };
}

const hostnameSchema = z.string()
  .min(4).max(253)
  .regex(/^([a-z0-9-]+\.)+[a-z]{2,}$/i, 'Hostname inválido.');

const uuidSchema = z.string().uuid();

export async function createDomainAction(
  organizationId: string,
  hostname: string
): Promise<ActionState> {
  try {
    const orgIdParsed = uuidSchema.safeParse(organizationId);
    if (!orgIdParsed.success) return { ok: false, error: 'organization_id inválido.' };
    const parsed = hostnameSchema.safeParse(hostname.trim().toLowerCase());
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Hostname inválido.' };
    const { supabase } = await requirePlatform();

    const token = `sr-${randomBytes(16).toString('hex')}`;
    const { data, error } = await supabase
      .from('tenant_domains')
      .insert({
        organization_id: orgIdParsed.data,
        hostname: parsed.data,
        status: 'pending',
        verification_token: token
      })
      .select('id')
      .single<{ id: string }>();
    if (error) return { ok: false, error: error.message };

    revalidatePath('/super-admin/dominios');
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
    const { supabase } = await requirePlatform();
    const { data: domain } = await supabase
      .from('tenant_domains')
      .select('id, organization_id')
      .eq('id', id)
      .maybeSingle<{ id: string; organization_id: string }>();
    if (!domain) return { ok: false, error: 'Domínio não encontrado.' };

    const { enqueueJob } = await import('@/lib/queue/enqueue');
    await enqueueJob({
      organizationId: domain.organization_id,
      kind: 'domain_verify',
      payload: { domain_id: id },
      priority: 3
    });
    revalidatePath('/super-admin/dominios');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}

export async function deleteDomainAction(id: string): Promise<ActionState> {
  try {
    const { supabase } = await requirePlatform();
    const { error } = await supabase
      .from('tenant_domains')
      .delete()
      .eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/super-admin/dominios');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}
