import 'server-only';
import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type ApiCaller = {
  organizationId: string;
  apiKeyId: string;
  scopes: string[];
};

/**
 * Authenticates an API request using Authorization: Bearer <api-key>.
 * The DB stores only sha256(key); raw keys are shown once at creation.
 *
 * Returns the caller on success, or a NextResponse (401/403) on failure.
 * Also updates last_used_at (best-effort) and logs the request.
 */
export async function authenticateApiRequest(
  req: Request,
  opts: { requiredScope?: string } = {}
): Promise<ApiCaller | NextResponse> {
  const auth = req.headers.get('authorization') ?? '';
  const match = auth.match(/^Bearer\s+(sk_[a-z]+_[A-Za-z0-9]+)$/);
  if (!match) return jsonError(401, 'missing_or_invalid_token');

  const raw = match[1];
  const hash = createHash('sha256').update(raw).digest('hex');
  const admin = createSupabaseAdminClient();

  const { data } = await admin
    .from('api_keys')
    .select('id, organization_id, scopes, expires_at, revoked_at')
    .eq('key_hash', hash)
    .maybeSingle();

  if (!data) return jsonError(401, 'unknown_token');
  if (data.revoked_at) return jsonError(401, 'token_revoked');
  if (data.expires_at && new Date(data.expires_at as string).getTime() < Date.now())
    return jsonError(401, 'token_expired');

  const scopes = (data.scopes as string[] | null) ?? [];
  if (opts.requiredScope && !scopes.includes(opts.requiredScope) && !scopes.includes('*'))
    return jsonError(403, `missing_scope:${opts.requiredScope}`);

  // best-effort last_used_at
  await admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);

  return {
    apiKeyId: data.id as string,
    organizationId: data.organization_id as string,
    scopes
  };
}

export async function logApiRequest(input: {
  organizationId: string;
  apiKeyId: string | null;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from('api_request_log').insert({
      organization_id: input.organizationId,
      api_key_id: input.apiKeyId,
      method: input.method,
      path: input.path,
      status_code: input.statusCode,
      latency_ms: input.latencyMs,
      ip: input.ip ?? null,
      user_agent: input.userAgent ?? null
    });
  } catch {
    // best-effort
  }
}

function jsonError(status: number, code: string) {
  return NextResponse.json({ ok: false, error: code }, { status });
}
