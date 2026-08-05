import 'server-only';
import { rateLimit as inMemoryLimit } from './rate-limit';
import { featureConfigured } from './env';

/**
 * Distributed rate limiter. Uses Upstash Redis when configured; falls back
 * to the process-local map (existing rate-limit.ts) when not.
 *
 * We deliberately implement Upstash via its REST API (no dep) to keep the
 * bundle small.
 */

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfter: number; // seconds
  backend: 'upstash' | 'memory';
};

export async function distRateLimit(
  key: string,
  opts: { max: number; windowMs: number }
): Promise<RateLimitResult> {
  if (featureConfigured.upstash) {
    try {
      return await upstashLimit(key, opts);
    } catch {
      // fallthrough
    }
  }
  const r = inMemoryLimit(key, opts);
  return { ...r, backend: 'memory' };
}

export async function assertDistRateLimit(
  key: string,
  opts: { max: number; windowMs: number; label?: string }
): Promise<void> {
  const r = await distRateLimit(key, opts);
  if (!r.ok) {
    throw new Error(
      `Muitas tentativas. ${opts.label ?? 'Aguarde'} ${r.retryAfter}s para tentar novamente.`
    );
  }
}

async function upstashLimit(
  key: string,
  opts: { max: number; windowMs: number }
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const bucketKey = `rl:${key}`;
  const ttlSec = Math.ceil(opts.windowMs / 1000);

  // Use INCR + EXPIRE via pipeline
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['INCR', bucketKey],
      ['EXPIRE', bucketKey, String(ttlSec), 'NX']
    ])
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const out = (await res.json()) as { result: number | string }[];
  const count = Number(out[0]?.result ?? 0);

  if (count > opts.max) {
    // fetch TTL for retryAfter
    const ttlRes = await fetch(`${url}/ttl/${encodeURIComponent(bucketKey)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const ttlData = (await ttlRes.json().catch(() => ({ result: ttlSec }))) as { result: number };
    return { ok: false, remaining: 0, retryAfter: Math.max(1, Number(ttlData.result)), backend: 'upstash' };
  }
  return { ok: true, remaining: Math.max(0, opts.max - count), retryAfter: 0, backend: 'upstash' };
}
