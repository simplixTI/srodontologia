#!/usr/bin/env node
/**
 * Validates staging environment configuration. Prints OK / WARN / ERR /
 * EXT_ACTION per component. NEVER prints secret values.
 *
 * Usage: node scripts/validate-staging.mjs [--fail-on-error]
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env.staging', override: false });

const FAIL_ON_ERROR = process.argv.includes('--fail-on-error');

const checks = [];

function check(name, status, detail) {
  checks.push({ name, status, detail });
}

function hasEnv(names) {
  return names.every((n) => !!process.env[n] && process.env[n].length > 0);
}

// ─── ENV required ────────────────────────────────────────────
check('NEXT_PUBLIC_APP_URL', hasEnv(['NEXT_PUBLIC_APP_URL']) ? 'OK' : 'ERR', hasEnv(['NEXT_PUBLIC_APP_URL']) ? 'defined' : 'missing');
check('Supabase URL',        hasEnv(['NEXT_PUBLIC_SUPABASE_URL']) ? 'OK' : 'ERR', hasEnv(['NEXT_PUBLIC_SUPABASE_URL']) ? 'defined' : 'missing');
check('Supabase anon',       hasEnv(['NEXT_PUBLIC_SUPABASE_ANON_KEY']) ? 'OK' : 'ERR', hasEnv(['NEXT_PUBLIC_SUPABASE_ANON_KEY']) ? 'defined' : 'missing');
check('Supabase service',    hasEnv(['SUPABASE_SERVICE_ROLE_KEY']) ? 'OK' : 'ERR', hasEnv(['SUPABASE_SERVICE_ROLE_KEY']) ? 'defined' : 'missing');

// ─── Optional / external ────────────────────────────────────
check('Sentry DSN',    hasEnv(['NEXT_PUBLIC_SENTRY_DSN']) ? 'OK' : 'WARN', hasEnv(['NEXT_PUBLIC_SENTRY_DSN']) ? 'defined' : 'not configured');
check('Sentry token',  hasEnv(['SENTRY_AUTH_TOKEN']) ? 'OK' : 'EXT_ACTION', hasEnv(['SENTRY_AUTH_TOKEN']) ? 'defined' : 'needed for source maps upload');
check('Upstash Redis', hasEnv(['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']) ? 'OK' : 'WARN', hasEnv(['UPSTASH_REDIS_REST_URL']) ? 'defined' : 'rate limit will use fallback');
check('Turnstile',     hasEnv(['NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY']) ? 'OK' : 'WARN', hasEnv(['TURNSTILE_SECRET_KEY']) ? 'defined' : 'CAPTCHA will fallback');
check('Email API',     hasEnv(['EMAIL_API_KEY']) ? 'OK' : 'WARN', hasEnv(['EMAIL_API_KEY']) ? 'defined' : 'emails will queue but not send');
check('TOTP secret',   hasEnv(['TOTP_SECRET_KEY']) ? 'OK' : 'ERR', hasEnv(['TOTP_SECRET_KEY']) ? 'defined' : 'needed for 2FA envelope');
check('IP salt',       hasEnv(['IP_HASH_SALT']) ? 'OK' : 'WARN', hasEnv(['IP_HASH_SALT']) ? 'defined' : 'using dev fallback (unsafe in prod)');
check('Cron secret',   hasEnv(['CRON_SECRET']) ? 'OK' : 'ERR', hasEnv(['CRON_SECRET']) ? 'defined' : 'crons unprotected');
check('Vercel API',    hasEnv(['VERCEL_API_TOKEN', 'VERCEL_PROJECT_ID']) ? 'OK' : 'EXT_ACTION', hasEnv(['VERCEL_API_TOKEN']) ? 'defined' : 'custom domain flow disabled');
check('Payment provider', 'EXT_ACTION', 'STANDBY — provider ainda não decidido pelo usuário');

// ─── Health check ao endpoint próprio (se APP_URL setado) ────
async function checkHealth() {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) return check('App health', 'WARN', 'skipped: NEXT_PUBLIC_APP_URL not set');
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/api/health`, { signal: AbortSignal.timeout(5000) });
    check('App health', res.ok ? 'OK' : 'ERR', `HTTP ${res.status}`);
  } catch (err) {
    check('App health', 'ERR', err.message);
  }
}
await checkHealth();

// ─── Print report ────────────────────────────────────────────
const iconFor = (s) => (
  s === 'OK' ? '✅' :
  s === 'WARN' ? '⚠️ ' :
  s === 'ERR' ? '❌' :
  '🕓'
);
const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);

// eslint-disable-next-line no-console
console.log('\nStaging validation report');
console.log('─'.repeat(80));
for (const c of checks) {
  // eslint-disable-next-line no-console
  console.log(`${iconFor(c.status)}  ${pad(c.name, 26)} ${pad(c.status, 12)} ${c.detail}`);
}
console.log('─'.repeat(80));

const errs = checks.filter((c) => c.status === 'ERR').length;
const warns = checks.filter((c) => c.status === 'WARN').length;
const ext = checks.filter((c) => c.status === 'EXT_ACTION').length;
// eslint-disable-next-line no-console
console.log(`\nSummary: ${checks.length - errs - warns - ext} OK · ${warns} WARN · ${errs} ERR · ${ext} EXT_ACTION\n`);

if (FAIL_ON_ERROR && errs > 0) process.exit(1);
