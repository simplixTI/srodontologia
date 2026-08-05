/**
 * Redaction rules used by Sentry `beforeSend` and `beforeBreadcrumb`.
 * Exposed separately so we can unit-test the sanitizer without booting the SDK.
 *
 * NEVER send: passwords, tokens, cookies, service role, CPF, patient name,
 * clinical content, message body, files, signed URLs, Stripe signatures,
 * CAPTCHA tokens, TOTP codes, backup codes.
 */

const DENY_KEYS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'access_token',
  'refresh_token',
  'api_key',
  'apikey',
  'authorization',
  'cookie',
  'set-cookie',
  'service_role',
  'anon_key',
  'stripe-signature',
  'stripe_signature',
  'captcha_token',
  'totp',
  'totp_code',
  'backup_code',
  'card',
  'cvc',
  'cvv',
  'ssn',
  'cpf',
  'cpf_hash',
  'patient_name',
  'clinical_description',
  'material_notes',
  'diagnosis',
  'message',
  'chat_body',
  'signed_url'
]);

const DENY_QUERY_KEYS = new Set([
  'token',
  'access_token',
  'refresh_token',
  'code',
  'captcha_token',
  'signed_url',
  'ref',
  'invite_token'
]);

const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const EMAIL_LOCAL_PATTERN = /([a-z0-9._%+-]+)@/gi;

export function redactObject<T>(input: T): T {
  if (input == null) return input;
  if (Array.isArray(input)) return input.map(redactObject) as unknown as T;
  if (typeof input !== 'object') {
    return typeof input === 'string' ? (redactString(input) as unknown as T) : input;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (DENY_KEYS.has(k.toLowerCase())) {
      out[k] = '***';
      continue;
    }
    out[k] = redactObject(v);
  }
  return out as T;
}

export function redactString(s: string): string {
  return s
    .replace(CPF_PATTERN, '***.***.***-**')
    .replace(EMAIL_LOCAL_PATTERN, (_, local: string) => `${local[0]}***@`);
}

export function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const k of Array.from(u.searchParams.keys())) {
      if (DENY_QUERY_KEYS.has(k.toLowerCase())) u.searchParams.set(k, '***');
    }
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Sentry-compatible beforeSend hook. Redacts request/user/extra/breadcrumb data.
 * Accepts any object shape (we don't import Sentry types here to keep the
 * module framework-agnostic for tests).
 */
export function beforeSendRedactor<T extends Record<string, unknown>>(event: T): T {
  const e = event as Record<string, unknown>;
  if (e.request && typeof e.request === 'object') {
    const req = e.request as Record<string, unknown>;
    if (typeof req.url === 'string') req.url = redactUrl(req.url);
    if (req.headers) req.headers = redactObject(req.headers);
    if (req.cookies) req.cookies = '***';
    if (req.query_string && typeof req.query_string === 'string') {
      req.query_string = redactUrl(`http://x/?${req.query_string}`).split('?')[1] ?? '';
    }
    if (req.data) req.data = redactObject(req.data);
  }
  if (e.user && typeof e.user === 'object') {
    const u = e.user as Record<string, unknown>;
    if (typeof u.email === 'string') u.email = redactString(u.email);
    delete u.ip_address;
  }
  if (e.extra) e.extra = redactObject(e.extra);
  if (Array.isArray(e.breadcrumbs)) {
    e.breadcrumbs = (e.breadcrumbs as Array<Record<string, unknown>>).map((b) => ({
      ...b,
      data: b.data ? redactObject(b.data) : undefined,
      message: typeof b.message === 'string' ? redactString(b.message) : b.message
    }));
  }
  if (Array.isArray(e.exception)) {
    // no-op: stack traces are already generic; message strings redacted below
  }
  if (typeof e.message === 'string') e.message = redactString(e.message);
  return e as T;
}
