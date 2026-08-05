import 'server-only';

/**
 * Server-side check of external integrations. Returns configured/unconfigured
 * per component WITHOUT ever exposing secret values. Used by the config-status
 * super-admin page and by the validate:staging CLI.
 */

export type ComponentStatus = 'ok' | 'warning' | 'error' | 'unconfigured';

export type ComponentCheck = {
  component: string;
  status: ComponentStatus;
  detail: string;
  configured: boolean;
};

function has(name: string): boolean {
  const v = process.env[name];
  return !!v && v.length > 0;
}

function hasAll(names: string[]): boolean {
  return names.every(has);
}

export function collectConfigChecks(): ComponentCheck[] {
  const results: ComponentCheck[] = [];

  results.push({
    component: 'supabase',
    configured: hasAll(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']),
    status: hasAll(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) ? 'ok' : 'error',
    detail: 'URL + anon + service role obrigatórios'
  });

  results.push({
    component: 'sentry',
    configured: has('NEXT_PUBLIC_SENTRY_DSN'),
    status: has('NEXT_PUBLIC_SENTRY_DSN') ? 'ok' : 'warning',
    detail: has('SENTRY_AUTH_TOKEN') ? 'DSN + auth token OK' : 'DSN OK; token de source maps opcional'
  });

  results.push({
    component: 'redis',
    configured: hasAll(['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']),
    status: hasAll(['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']) ? 'ok' : 'warning',
    detail: 'Rate limit distribuído; fallback in-memory se ausente'
  });

  results.push({
    component: 'turnstile',
    configured: hasAll(['NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY']),
    status: hasAll(['NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY']) ? 'ok' : 'warning',
    detail: 'CAPTCHA anti-bot; ausente = allow em signup'
  });

  results.push({
    component: 'email',
    configured: has('EMAIL_API_KEY'),
    status: has('EMAIL_API_KEY') ? 'ok' : 'warning',
    detail: has('EMAIL_API_KEY') ? 'Provider configurado' : 'E-mails ficarão em outbox, sem envio'
  });

  results.push({
    component: 'vercel_domains',
    configured: hasAll(['VERCEL_API_TOKEN', 'VERCEL_PROJECT_ID']),
    status: hasAll(['VERCEL_API_TOKEN', 'VERCEL_PROJECT_ID']) ? 'ok' : 'warning',
    detail: 'Necessário para custom domains dos tenants'
  });

  results.push({
    component: 'totp',
    configured: has('TOTP_SECRET_KEY'),
    status: has('TOTP_SECRET_KEY') ? 'ok' : 'error',
    detail: 'Envelope de 2FA — obrigatório em produção'
  });

  results.push({
    component: 'ip_salt',
    configured: has('IP_HASH_SALT'),
    status: has('IP_HASH_SALT') ? 'ok' : 'warning',
    detail: 'Sem salt custom, usa fallback (não recomendado em prod)'
  });

  results.push({
    component: 'cron_secret',
    configured: has('CRON_SECRET'),
    status: has('CRON_SECRET') ? 'ok' : 'error',
    detail: 'Sem segredo, endpoints /api/cron são públicos'
  });

  results.push({
    component: 'payment_provider',
    configured: false,
    status: 'warning',
    detail: 'STANDBY — provider ainda não decidido (Stripe/MP/Asaas/Iugu/Pagarme)'
  });

  return results;
}
