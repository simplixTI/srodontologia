import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getClock } from '@/lib/time/clock';
import { parseCsv, type ParseResult } from './csv-parser';
import { getEntity, type ImportEntityKey, type EntityDefinition } from './entities';

/**
 * CSV import orchestration. The public surface is:
 *   - runDryRun: parse + validate + dedupe simulate. No writes.
 *   - runApply:  same as dry-run, then inserts rows the dry-run marked ok.
 *
 * Both write a `data_imports` row (state machine) and per-row entries in
 * `data_import_rows` for post-hoc audit + error download.
 *
 * Idempotency: caller passes `idempotencyKey`. If a completed run with that
 * key + entity + org exists, we short-circuit and return its report.
 */

export type RunOutcome = {
  importId: string;
  status: 'completed' | 'failed' | 'skipped_idempotent';
  totals: { total: number; ok: number; error: number; duplicate: number };
  warnings: string[];
  errorsSample: Array<{ rowNumber: number; message: string }>;
};

export type RunInput = {
  organizationId: string;
  entity: ImportEntityKey;
  csv: string | Uint8Array;
  storagePath?: string;
  createdBy?: string | null;
  idempotencyKey?: string;
};

export async function runDryRun(input: RunInput): Promise<RunOutcome> {
  return runInternal({ ...input, dryRun: true });
}

export async function runApply(input: RunInput): Promise<RunOutcome> {
  return runInternal({ ...input, dryRun: false });
}

async function runInternal(input: RunInput & { dryRun: boolean }): Promise<RunOutcome> {
  const entity = getEntity(input.entity);
  if (!entity) throw new Error(`unknown entity: ${input.entity}`);
  const admin = createSupabaseAdminClient();

  // Idempotency short-circuit only applies to apply runs (not dry-runs — those must always re-parse).
  if (!input.dryRun && input.idempotencyKey) {
    const { data: prior } = await admin
      .from('data_imports')
      .select('id, status, rows_ok, rows_error, rows_duplicate, row_count')
      .eq('organization_id', input.organizationId)
      .eq('entity', input.entity)
      .eq('idempotency_key', input.idempotencyKey)
      .eq('status', 'completed')
      .maybeSingle<{ id: string; status: string; rows_ok: number; rows_error: number; rows_duplicate: number; row_count: number }>();
    if (prior) {
      return {
        importId: prior.id,
        status: 'skipped_idempotent',
        totals: { total: prior.row_count, ok: prior.rows_ok, error: prior.rows_error, duplicate: prior.rows_duplicate },
        warnings: [`Reaproveitando import ${prior.id} (idempotencyKey já concluído).`],
        errorsSample: []
      };
    }
  }

  // Register the import row up-front so the UI can poll.
  const { data: imp, error: impErr } = await admin
    .from('data_imports')
    .insert({
      organization_id: input.organizationId,
      entity: input.entity,
      status: input.dryRun ? 'validating' : 'processing',
      storage_path: input.storagePath ?? null,
      dry_run: input.dryRun,
      idempotency_key: input.idempotencyKey ?? null,
      created_by: input.createdBy ?? null,
      started_at: getClock().now().toISOString()
    })
    .select('id')
    .single<{ id: string }>();
  if (impErr || !imp) throw new Error(`data_imports insert failed: ${impErr?.message}`);
  const importId = imp.id;

  let parsed: ParseResult;
  try {
    parsed = parseCsv(input.csv, entity.headers.slice() as string[]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'parse failed';
    await admin.from('data_imports').update({
      status: 'failed',
      completed_at: getClock().now().toISOString(),
      error: message
    }).eq('id', importId);
    return {
      importId,
      status: 'failed',
      totals: { total: 0, ok: 0, error: 0, duplicate: 0 },
      warnings: [],
      errorsSample: [{ rowNumber: 0, message }]
    };
  }

  const validated = validateRows(parsed, entity);

  await admin.from('data_import_rows').insert(
    validated.rows.map((r) => ({
      import_id: importId,
      row_number: r.rowNumber,
      status: r.status,
      raw: r.raw,
      parsed: r.parsed,
      errors: r.errors
    }))
  );

  let insertedOk = 0;
  if (!input.dryRun) {
    const okRows = validated.rows.filter((r) => r.status === 'ok' && r.parsed);
    for (const row of okRows) {
      const payload = { ...row.parsed, organization_id: input.organizationId } as Record<string, unknown>;
      const { data, error } = await admin
        .from(entity.target)
        .insert(payload)
        .select('id')
        .maybeSingle<{ id: string }>();
      if (error) {
        // Rewrite this row to error post-facto
        await admin.from('data_import_rows').update({
          status: 'error',
          errors: [{ field: '_db', message: error.message }]
        }).eq('import_id', importId).eq('row_number', row.rowNumber);
        validated.rows.find((r) => r.rowNumber === row.rowNumber)!.status = 'error';
      } else if (data) {
        await admin.from('data_import_rows').update({ created_entity_id: data.id }).eq('import_id', importId).eq('row_number', row.rowNumber);
        insertedOk++;
      }
    }
  }

  const totalsFinal = tally(validated.rows);
  const okFinal = input.dryRun ? totalsFinal.ok : insertedOk;

  await admin.from('data_imports').update({
    status: 'completed',
    completed_at: getClock().now().toISOString(),
    row_count: parsed.rows.length,
    rows_ok: okFinal,
    rows_error: totalsFinal.error,
    rows_duplicate: totalsFinal.duplicate
  }).eq('id', importId);

  return {
    importId,
    status: 'completed',
    totals: { total: parsed.rows.length, ok: okFinal, error: totalsFinal.error, duplicate: totalsFinal.duplicate },
    warnings: parsed.warnings,
    errorsSample: validated.rows
      .filter((r) => r.status === 'error')
      .slice(0, 10)
      .map((r) => ({ rowNumber: r.rowNumber, message: r.errors.map((e) => `${e.field}: ${e.message}`).join('; ') }))
  };
}

type ValidatedRow = {
  rowNumber: number;
  status: 'ok' | 'error' | 'duplicate';
  raw: Record<string, string>;
  parsed: Record<string, unknown> | null;
  errors: Array<{ field: string; message: string }>;
};

function validateRows(parsed: ParseResult, entity: EntityDefinition): { rows: ValidatedRow[] } {
  const seen = new Set<string>();
  const rows: ValidatedRow[] = parsed.rows.map((r) => {
    const result = entity.schema.safeParse(r.raw);
    if (!result.success) {
      return {
        rowNumber: r.rowNumber,
        status: 'error',
        raw: r.raw,
        parsed: null,
        errors: result.error.issues.map((i) => ({ field: i.path.join('.') || '_', message: i.message }))
      };
    }
    const dedupeKey = entity.dedupeKeys
      .map((k) => (result.data as Record<string, unknown>)[k] ?? '')
      .join('|')
      .toLowerCase();
    if (dedupeKey && dedupeKey !== '||||' && seen.has(dedupeKey)) {
      return { rowNumber: r.rowNumber, status: 'duplicate', raw: r.raw, parsed: result.data as Record<string, unknown>, errors: [] };
    }
    if (dedupeKey) seen.add(dedupeKey);
    return { rowNumber: r.rowNumber, status: 'ok', raw: r.raw, parsed: result.data as Record<string, unknown>, errors: [] };
  });
  return { rows };
}

function tally(rows: ValidatedRow[]): { ok: number; error: number; duplicate: number } {
  return rows.reduce(
    (a, r) => {
      if (r.status === 'ok') a.ok++;
      else if (r.status === 'error') a.error++;
      else if (r.status === 'duplicate') a.duplicate++;
      return a;
    },
    { ok: 0, error: 0, duplicate: 0 }
  );
}
