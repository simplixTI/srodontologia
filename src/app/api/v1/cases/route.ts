import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { authenticateApiRequest, logApiRequest } from '@/lib/api/auth';
import { apiRateLimit } from '@/lib/api/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/cases?limit=&status=
 * Scope required: cases:read
 * Returns cases for the caller's organization.
 */
export async function GET(req: Request) {
  const started = Date.now();
  const url = new URL(req.url);
  const caller = await authenticateApiRequest(req, { requiredScope: 'cases:read' });
  if (caller instanceof NextResponse) return caller;

  const limited = apiRateLimit(caller.apiKeyId);
  if (limited) return limited;

  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '25', 10)));
  const status = url.searchParams.get('status');

  const admin = createSupabaseAdminClient();
  let q = admin
    .from('cases')
    .select('id, case_number, title, priority, internal_status, public_status, requested_delivery_date, estimated_delivery_date, actual_delivery_date, created_at')
    .eq('organization_id', caller.organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (status) q = q.eq('public_status', status);

  const { data, error } = await q;
  const statusCode = error ? 500 : 200;
  const body = error ? { ok: false, error: error.message } : { ok: true, data: data ?? [] };

  await logApiRequest({
    organizationId: caller.organizationId,
    apiKeyId: caller.apiKeyId,
    method: 'GET',
    path: '/api/v1/cases',
    statusCode,
    latencyMs: Date.now() - started,
    ip: req.headers.get('x-forwarded-for'),
    userAgent: req.headers.get('user-agent')
  });
  return NextResponse.json(body, { status: statusCode });
}
