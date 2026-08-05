import { NextResponse } from 'next/server';
import { processNextJob } from '@/lib/queue/worker';
import { scanForOverdueCases } from '@/lib/prazo/overdue-detector';
import { runWithLock } from '@/lib/cron/lock';
import { runDunningTick } from '@/lib/billing/dunning';
import { revalidateDomainsTick } from '@/lib/domains/revalidation';

export const dynamic = 'force-dynamic';
export const maxDuration = 55;

/**
 * Consolidated cron endpoint invoked by Vercel Cron / external scheduler.
 *
 * Per invocation (each protected by cron_runs lock — safe to schedule aggressively):
 *   1) Drain up to N ready jobs from the queue (up to 40s window)
 *   2) Scan for overdue cases and emit `case.overdue`
 *   3) Advance dunning stages for past-due tenants
 *
 * Auth: `Authorization: Bearer $CRON_SECRET` required.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  let processed = 0;
  const limitMs = 40_000;

  while (Date.now() - started < limitMs) {
    const did = await processNextJob();
    if (!did) break;
    processed++;
    if (processed >= 25) break;
  }

  const overdue = await runWithLock('scan-overdue-cases', async () => {
    const emitted = await scanForOverdueCases();
    return { metrics: { emitted }, result: emitted };
  });

  const dunning = await runWithLock('dunning-tick', async () => {
    const res = await runDunningTick();
    return { metrics: res, result: res };
  });

  const domains = await runWithLock('domain-revalidation', async () => {
    const res = await revalidateDomainsTick();
    return { metrics: res, result: res };
  });

  return NextResponse.json({
    ok: true,
    processed,
    overdue,
    dunning,
    domains,
    ms: Date.now() - started
  });
}

export async function POST(req: Request) {
  return GET(req);
}
