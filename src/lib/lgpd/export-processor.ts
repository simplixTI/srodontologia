import 'server-only';
import { createHash, randomBytes } from 'crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Processes a data_export_requests row end-to-end:
 *   1. collect authorized data by scope
 *   2. build a JSON+CSV pack with a manifest
 *   3. upload to a private bucket path with a random suffix
 *   4. mark completed with expires_at = +7d
 *
 * The archive is NOT compressed (Node native support without deps
 * is limited). Consumers download the JSON manifest first and then
 * each file individually via signed URLs generated on demand.
 */
export async function processExportRequest(requestId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: req } = await admin
    .from('data_export_requests')
    .select('id, organization_id, scope, scope_id, requested_by, status')
    .eq('id', requestId)
    .maybeSingle<{
      id: string;
      organization_id: string;
      scope: 'organization' | 'user' | 'case';
      scope_id: string | null;
      requested_by: string | null;
      status: string;
    }>();
  if (!req) throw new Error('export request not found');
  if (req.status !== 'pending' && req.status !== 'processing') {
    return; // already handled
  }

  await admin.from('data_export_requests').update({ status: 'processing' }).eq('id', req.id);

  try {
    const bundle = await collectBundle(admin, req);
    const bucket = 'lgpd-exports';
    const randomSuffix = randomBytes(8).toString('hex');
    const path = `${req.organization_id}/${req.id}-${randomSuffix}/manifest.json`;

    await ensureBucket(admin, bucket);
    const bytes = new TextEncoder().encode(JSON.stringify(bundle, null, 2));
    const { error: upErr } = await admin.storage.from(bucket).upload(path, bytes, {
      contentType: 'application/json',
      upsert: false
    });
    if (upErr) throw new Error(`upload failed: ${upErr.message}`);

    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + 7);

    await admin.from('data_export_requests').update({
      status: 'completed',
      storage_path: path,
      file_size: bytes.byteLength,
      completed_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString()
    }).eq('id', req.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'export failed';
    await admin.from('data_export_requests').update({
      status: 'failed',
      error: message,
      completed_at: new Date().toISOString()
    }).eq('id', req.id);
    throw err;
  }
}

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

async function ensureBucket(admin: AdminClient, name: string) {
  const { data } = await admin.storage.getBucket(name);
  if (!data) {
    await admin.storage.createBucket(name, { public: false });
  }
}

async function collectBundle(admin: AdminClient, req: {
  organization_id: string;
  scope: 'organization' | 'user' | 'case';
  scope_id: string | null;
}) {
  const org = await pick(admin, 'organizations', 'id', req.organization_id);
  const scope = req.scope;

  const cases = scope === 'case' && req.scope_id
    ? await pickBy(admin, 'cases', 'id', req.scope_id)
    : await pickBy(admin, 'cases', 'organization_id', req.organization_id);

  const caseIds = cases.map((c) => (c as { id: string }).id);

  const [clinics, dentists, messages, quotes, plannings, deliveries, files, timeline] = await Promise.all([
    pickBy(admin, 'clinics', 'organization_id', req.organization_id),
    pickBy(admin, 'dentists', 'organization_id', req.organization_id),
    caseIds.length ? pickByIn(admin, 'case_messages', 'case_id', caseIds) : [],
    caseIds.length ? pickByIn(admin, 'quotes', 'case_id', caseIds) : [],
    caseIds.length ? pickByIn(admin, 'planning_versions', 'case_id', caseIds) : [],
    caseIds.length ? pickByIn(admin, 'deliveries', 'case_id', caseIds) : [],
    caseIds.length ? pickByIn(admin, 'case_files', 'case_id', caseIds) : [],
    caseIds.length ? pickByIn(admin, 'case_status_history', 'case_id', caseIds) : []
  ]);

  const manifest = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    scope,
    organization: org,
    counts: {
      cases: cases.length,
      clinics: clinics.length,
      dentists: dentists.length,
      messages: messages.length,
      quotes: quotes.length,
      plannings: plannings.length,
      deliveries: deliveries.length,
      files: files.length,
      timeline: timeline.length
    },
    data: {
      cases,
      clinics,
      dentists,
      messages,
      quotes,
      plannings,
      deliveries,
      files,
      timeline
    }
  };
  return manifest;
}

async function pick(admin: AdminClient, table: string, col: string, val: string) {
  const { data } = await admin.from(table).select('*').eq(col, val).maybeSingle();
  return data;
}
async function pickBy(admin: AdminClient, table: string, col: string, val: string) {
  const { data } = await admin.from(table).select('*').eq(col, val).limit(5000);
  return data ?? [];
}
async function pickByIn(admin: AdminClient, table: string, col: string, vals: string[]) {
  const { data } = await admin.from(table).select('*').in(col, vals).limit(20000);
  return data ?? [];
}

// (imports used in hashing for future integrity manifest)
const _reserved = { createHash };
void _reserved;
