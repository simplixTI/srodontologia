'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requirePlatformUser } from '@/lib/permissions/platform';

export type ActionState = { ok: boolean; error?: string };

/**
 * Requeues a job that is failed / dead_letter for another try.
 * Resets attempts + status back to `queued` with immediate run_after.
 */
export async function reprocessJobAction(id: string): Promise<ActionState> {
  try {
    const parsed = z.string().uuid().safeParse(id);
    if (!parsed.success) return { ok: false, error: 'ID inválido.' };
    const user = await requirePlatformUser();

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from('jobs')
      .update({
        status: 'queued',
        attempts: 0,
        error: null,
        run_after: new Date().toISOString(),
        locked_at: null,
        locked_by: null,
        dead_lettered_at: null,
        dead_letter_reason: null
      })
      .eq('id', parsed.data);
    if (error) return { ok: false, error: error.message };

    await admin.from('security_events').insert({
      user_id: user.id,
      event_type: 'job_reprocessed',
      metadata: { job_id: parsed.data }
    });

    revalidatePath('/super-admin/jobs');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}

export async function cancelJobAction(id: string): Promise<ActionState> {
  try {
    const parsed = z.string().uuid().safeParse(id);
    if (!parsed.success) return { ok: false, error: 'ID inválido.' };
    const user = await requirePlatformUser();

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from('jobs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        locked_at: null,
        locked_by: null
      })
      .eq('id', parsed.data)
      .in('status', ['queued', 'running']);
    if (error) return { ok: false, error: error.message };

    await admin.from('security_events').insert({
      user_id: user.id,
      event_type: 'job_cancelled',
      metadata: { job_id: parsed.data }
    });

    revalidatePath('/super-admin/jobs');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}
