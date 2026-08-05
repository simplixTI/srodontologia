// Post-deploy smoke test.
// Usage: `E2E_BASE_URL=https://staging.srdigital.com.br node scripts/smoke.mjs`
// Non-zero exit blocks deploy promotion.

const base = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

const checks = [
  { name: 'liveness', path: '/api/health', expect: { ok: true } },
  { name: 'readiness', path: '/api/health/ready' },      // 200 or 503 acceptable
  { name: 'home', path: '/' },
  { name: 'login page', path: '/login' },
  { name: 'signup page', path: '/signup' },
  { name: 'status page', path: '/status' },
  { name: 'terms page', path: '/termos' },
  { name: 'openapi spec', path: '/api/v1/openapi' },
  { name: 'cron rejects anon', path: '/api/cron', expectStatus: 401 }
];

let failed = 0;

for (const c of checks) {
  const url = new URL(c.path, base).toString();
  const started = Date.now();
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const ms = Date.now() - started;
    const ok = c.expectStatus ? res.status === c.expectStatus : res.status < 500;
    let bodyOk = true;
    if (c.expect) {
      try {
        const j = await res.json();
        bodyOk = Object.entries(c.expect).every(([k, v]) => j[k] === v);
      } catch {
        bodyOk = false;
      }
    }
    if (ok && bodyOk) {
      console.log(`OK    ${res.status}  ${ms}ms  ${c.name}`);
    } else {
      console.log(`FAIL  ${res.status}  ${ms}ms  ${c.name}`);
      failed++;
    }
  } catch (err) {
    console.log(`FAIL   -    -    ${c.name} — ${err instanceof Error ? err.message : 'error'}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} smoke check(s) failed`);
  process.exit(1);
}
console.log('\nAll smoke checks passed.');
