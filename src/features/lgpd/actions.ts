'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { enqueueJob } from '@/lib/queue/enqueue';

export type ActionState = { ok: boolean; error?: string; id?: string };

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

const exportSchema = z.object({
  scope: z.enum(['organization', 'user', 'case']).default('organization'),
  scope_id: z.string().uuid().optional().nullable()
});

/**
 * Requests a full data export (LGPD art. 18, II).
 * Creates a data_export_requests row + enqueues a job. Result will be a
 * signed URL emailed to the requester.
 */
export async function requestDataExportAction(input: unknown): Promise<ActionState> {
  try {
    const parsed = exportSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: 'Dados inválidos.' };
    const { supabase, user, profile } = await requireOrgAdmin();

    const { data, error } = await supabase
      .from('data_export_requests')
      .insert({
        organization_id: profile.organization_id,
        requested_by: user.id,
        scope: parsed.data.scope,
        scope_id: parsed.data.scope_id ?? null
      })
      .select('id')
      .single<{ id: string }>();
    if (error) return { ok: false, error: error.message };

    await enqueueJob({
      organizationId: profile.organization_id,
      kind: 'lgpd_export',
      payload: { request_id: data!.id },
      createdBy: user.id
    });

    revalidatePath('/lgpd');
    return { ok: true, id: data!.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}

const deletionSchema = z.object({
  scope: z.enum(['organization', 'user', 'case']).default('organization'),
  scope_id: z.string().uuid().optional().nullable(),
  reason: z.string().max(1000).optional().nullable()
});

/**
 * Requests deletion of data (LGPD art. 18, VI).
 * Deletion is deferred 30 days (scheduled_at) to allow reversal.
 */
export async function requestDataDeletionAction(input: unknown): Promise<ActionState> {
  try {
    const parsed = deletionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: 'Dados inválidos.' };
    const { supabase, user, profile } = await requireOrgAdmin();

    const scheduled = new Date();
    scheduled.setUTCDate(scheduled.getUTCDate() + 30);

    const { data, error } = await supabase
      .from('data_deletion_requests')
      .insert({
        organization_id: profile.organization_id,
        requested_by: user.id,
        scope: parsed.data.scope,
        scope_id: parsed.data.scope_id ?? null,
        reason: parsed.data.reason ?? null,
        scheduled_at: scheduled.toISOString()
      })
      .select('id')
      .single<{ id: string }>();
    if (error) return { ok: false, error: error.message };

    revalidatePath('/lgpd');
    return { ok: true, id: data!.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}
