// Shared helpers for all k6 scenarios.
// k6 runs its own JS runtime (goja) — no Node imports available.

import http from 'k6/http';
import { check, fail } from 'k6';

const PROD_HOSTS = ['app.srdigital.com.br', 'srdigital.com.br'];

/** Loads BASE_URL from env, blocks prod hosts. */
export function getBaseUrl() {
  const base = __ENV.BASE_URL;
  if (!base) fail('BASE_URL is required');
  for (const p of PROD_HOSTS) {
    if (base.includes(p)) {
      fail(`REFUSED: BASE_URL ${base} matches production host ${p}`);
    }
  }
  return base.replace(/\/$/, '');
}

export function healthCheck(base) {
  const res = http.get(`${base}/api/health`, { tags: { name: 'health' } });
  check(res, {
    'health 200': (r) => r.status === 200
  });
  return res;
}

export function readinessCheck(base) {
  const res = http.get(`${base}/api/readiness`, { tags: { name: 'readiness' } });
  check(res, {
    'readiness 200': (r) => r.status === 200 || r.status === 503
  });
  return res;
}

export function anonHome(base) {
  const res = http.get(`${base}/`, { tags: { name: 'home' } });
  check(res, {
    'home 200': (r) => r.status === 200
  });
  return res;
}

export function statusPage(base) {
  const res = http.get(`${base}/status`, { tags: { name: 'status' } });
  check(res, { 'status 200': (r) => r.status === 200 });
  return res;
}
