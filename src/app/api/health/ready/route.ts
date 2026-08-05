import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Readiness probe — verifies critical dependencies. Slower than /health.
 * Returns 200 only when the app can actually serve traffic.
 */
export async function GET() {
  const results: Record<string, { ok: boolean; latency_ms?: number; error?: string }> = {};

  await Promise.all([
    check(results, 'db', async () => {
      const admin = createSupabaseAdminClient();
      const { error } = await admin.from('organizations').select('id', { head: true, count: 'exact' }).limit(1);
      if (error) throw new Error(error.message);
    }),
    check(results, 'stripe_configured', async () => {
      // Doesn't hit Stripe — just checks env presence
      if (!process.env.STRIPE_SECRET_KEY) throw new Error('missing');
    }),
    check(results, 'cron_secret_set', async () => {
      if (!process.env.CRON_SECRET) throw new Error('missing');
    })
  ]);

  const okDb = results.db?.ok ?? false;
  const status = okDb ? 200 : 503;

  return NextResponse.json(
    {
      ok: okDb,
      checks: results,
      time: new Date().toISOString()
    },
    { status }
  );
}

async function check(
  results: Record<string, { ok: boolean; latency_ms?: number; error?: string }>,
  name: string,
  fn: () => Promise<void>
) {
  const t0 = Date.now();
  try {
    await Promise.race([
      fn(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]);
    results[name] = { ok: true, latency_ms: Date.now() - t0 };
  } catch (err) {
    results[name] = { ok: false, latency_ms: Date.now() - t0, error: err instanceof Error ? err.message : 'error' };
  }
}
