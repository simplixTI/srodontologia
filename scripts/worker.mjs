// Long-running Node worker for local dev.
// Usage: `node --env-file=.env.local scripts/worker.mjs`
//
// In production, prefer the HTTP cron endpoint at /api/cron and let Vercel
// Cron drive it every minute. This script is convenient for dev debugging.

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('ts-node/esm', pathToFileURL('./'));

const { processNextJob } = await import('../src/lib/queue/worker.ts');

let stopped = false;
process.on('SIGINT', () => (stopped = true));
process.on('SIGTERM', () => (stopped = true));

console.log('[worker] started');

while (!stopped) {
  try {
    const did = await processNextJob();
    if (!did) await sleep(1500);
  } catch (err) {
    console.error('[worker] loop error', err);
    await sleep(3000);
  }
}
console.log('[worker] stopped');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
