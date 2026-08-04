import 'server-only';

/**
 * In-memory rate limiter (per-process). Suficiente para Vercel serverless
 * quando o número de invocações concorrentes por usuário é baixo. Para
 * escala real, trocar por Upstash Redis + @upstash/ratelimit.
 *
 * Uso:
 *   const check = await rateLimit(`upload:${userId}`, { max: 20, windowMs: 60_000 });
 *   if (!check.ok) throw new Error(check.retryAfter + 's');
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_ENTRIES = 5000;

function sweep(now: number) {
  if (buckets.size < MAX_ENTRIES) return;
  for (const [k, v] of buckets) {
    if (v.resetAt < now) buckets.delete(k);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfter: number; // seconds
};

export function rateLimit(
  key: string,
  opts: { max: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    sweep(now);
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.max - 1, retryAfter: 0 };
  }
  if (b.count >= opts.max) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.ceil((b.resetAt - now) / 1000)
    };
  }
  b.count += 1;
  return { ok: true, remaining: opts.max - b.count, retryAfter: 0 };
}

/** Throws Error(mensagem) se limite excedido. */
export function assertRateLimit(
  key: string,
  opts: { max: number; windowMs: number; label?: string }
) {
  const r = rateLimit(key, opts);
  if (!r.ok) {
    throw new Error(
      `Muitas tentativas. ${opts.label ?? 'Aguarde'} ${r.retryAfter}s para tentar novamente.`
    );
  }
}
