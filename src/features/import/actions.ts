'use server';

import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { runDryRun } from '@/lib/import/orchestrator';
import { getEntity, type ImportEntityKey } from '@/lib/import/entities';

const startSchema = z.object({
  entity: z.enum(['clinics', 'dentists', 'patients', 'cases']),
  csv:    z.string().min(1, 'CSV vazio').max(5 * 1024 * 1024, 'CSV excede 5 MB')
});

export async function startDryRunAction(input: unknown): Promise<
  | { ok: true; importId: string; totals: { total: number; ok: number; error: number; duplicate: number }; errorsSample: Array<{ rowNumber: number; message: string }>; warnings: string[] }
  | { ok: false; error: string }
> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid input' };

  const supa = createSupabaseServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated' };

  const { data: profile } = await supa
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string | null; role: string }>();
  if (!profile?.organization_id) return { ok: false, error: 'no_org' };
  if (!['super_admin', 'admin'].includes(profile.role)) return { ok: false, error: 'forbidden' };

  const outcome = await runDryRun({
    organizationId: profile.organization_id,
    entity: parsed.data.entity as ImportEntityKey,
    csv: parsed.data.csv,
    createdBy: user.id
  });

  if (outcome.status === 'failed') {
    return { ok: false, error: outcome.errorsSample[0]?.message ?? 'parse failed' };
  }

  return {
    ok: true,
    importId: outcome.importId,
    totals: outcome.totals,
    errorsSample: outcome.errorsSample,
    warnings: outcome.warnings
  };
}

/**
 * Applies a previously-uploaded CSV asynchronously. Enqueues a csv_import job
 * so a large file doesn't block the server action.
 */
export async function enqueueApplyAction(input: {
  entity: ImportEntityKey;
  storagePath: string;
  idempotencyKey?: string;
}): Promise<{ ok: true; jobId: string } | { ok: false; error: string }> {
  const entity = getEntity(input.entity);
  if (!entity) return { ok: false, error: 'unknown_entity' };

  const supa = createSupabaseServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated' };
  const { data: profile } = await supa
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string | null; role: string }>();
  if (!profile?.organization_id) return { ok: false, error: 'no_org' };
  if (!['super_admin', 'admin'].includes(profile.role)) return { ok: false, error: 'forbidden' };

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from('jobs').insert({
    organization_id: profile.organization_id,
    kind: 'csv_import',
    priority: 5,
    payload: {
      entity: input.entity,
      storage_path: input.storagePath,
      idempotency_key: input.idempotencyKey ?? null,
      created_by: user.id
    }
  }).select('id').single<{ id: string }>();
  if (error || !data) return { ok: false, error: error?.message ?? 'enqueue failed' };
  return { ok: true, jobId: data.id };
}
