import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { runApply } from '@/lib/import/orchestrator';
import type { Job } from '../types';
import type { ImportEntityKey } from '@/lib/import/entities';

/**
 * Async CSV apply. Downloads the CSV from the private `data-imports` bucket
 * (path stored on data_imports.storage_path) and runs the orchestrator.
 *
 * The `data_imports` row was already created by the trigger action; this
 * processor updates it via the orchestrator's own writes.
 */
export async function processCsvImport(job: Job<Record<string, unknown>>): Promise<Record<string, unknown>> {
  const p = job.payload as {
    entity?: ImportEntityKey;
    storage_path?: string;
    idempotency_key?: string;
    created_by?: string | null;
  };
  if (!p?.entity || !p?.storage_path) {
    return { skipped: true, reason: 'invalid_payload' };
  }

  const admin = createSupabaseAdminClient();
  const { data: fileBlob, error: dlErr } = await admin.storage
    .from('data-imports')
    .download(p.storage_path);
  if (dlErr || !fileBlob) throw new Error(`download failed: ${dlErr?.message ?? 'no blob'}`);

  const buffer = new Uint8Array(await fileBlob.arrayBuffer());
  const outcome = await runApply({
    organizationId: job.organization_id,
    entity: p.entity,
    csv: buffer,
    storagePath: p.storage_path,
    idempotencyKey: p.idempotency_key,
    createdBy: p.created_by ?? null
  });

  return {
    import_id: outcome.importId,
    status: outcome.status,
    totals: outcome.totals
  };
}
