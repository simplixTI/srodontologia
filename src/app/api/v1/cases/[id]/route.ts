import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { authenticateApiRequest, logApiRequest } from '@/lib/api/auth';
import { apiRateLimit } from '@/lib/api/rate-limit';

export const dynamic = 'force-dynamic';

/** GET /api/v1/cases/{id} — scope: cases:read */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const started = Date.now();
  const caller = await authenticateApiRequest(req, { requiredScope: 'cases:read' });
  if (caller instanceof NextResponse) return caller;

  const limited = apiRateLimit(caller.apiKeyId);
  if (limited) return limited;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('cases')
    .select('id, case_number, title, priority, internal_status, public_status, clinical_description, material, shade, requested_delivery_date, estimated_delivery_date, actual_delivery_date, submitted_at, created_at, updated_at')
    .eq('organization_id', caller.organizationId)
    .eq('id', params.id)
    .maybeSingle();

  const statusCode = error ? 500 : data ? 200 : 404;
  const body = error
    ? { ok: false, error: error.message }
    : data
    ? { ok: true, data }
    : { ok: false, error: 'not_found' };

  await logApiRequest({
    organizationId: caller.organizationId,
    apiKeyId: caller.apiKeyId,
    method: 'GET',
    path: `/api/v1/cases/${params.id}`,
    statusCode,
    latencyMs: Date.now() - started,
    ip: req.headers.get('x-forwarded-for'),
    userAgent: req.headers.get('user-agent')
  });
  return NextResponse.json(body, { status: statusCode });
}
