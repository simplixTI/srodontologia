import { NextResponse } from 'next/server';
import { handleStripeWebhook } from '@/lib/billing/webhook-handler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Public webhook receiver for billing providers.
 *
 * Path: /api/webhooks/billing/{provider}
 * Auth: HMAC signature validated per provider.
 * Idempotency: enforced via billing_events unique constraint.
 */
export async function POST(req: Request, { params }: { params: { provider: string } }) {
  if (params.provider !== 'stripe') {
    return NextResponse.json({ ok: false, error: 'unknown_provider' }, { status: 404 });
  }
  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => { headers[k] = v; });

  const result = await handleStripeWebhook(headers, rawBody);
  if (result.ok) return NextResponse.json(result, { status: 200 });
  return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
}
