import 'server-only';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

/** In-process API rate limiter (per api key). */
export function apiRateLimit(apiKeyId: string, opts: { max: number; windowMs: number } = { max: 120, windowMs: 60_000 }) {
  const r = rateLimit(`api:${apiKeyId}`, opts);
  if (r.ok) return null;
  return NextResponse.json(
    { ok: false, error: 'rate_limited', retry_after: r.retryAfter },
    { status: 429, headers: { 'Retry-After': String(r.retryAfter) } }
  );
}
