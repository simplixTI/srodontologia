import 'server-only';

/**
 * Structured JSON logger. Prints to stdout in production (picked up by
 * Vercel/Datadog/CloudWatch). In dev prints as pretty text.
 *
 * Redacts obvious secret-shaped keys before serializing.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type LogContext = {
  environment?: string;
  service?: string;
  route?: string;
  tenant_id?: string | null;
  user_id?: string | null;
  correlation_id?: string | null;
  request_id?: string | null;
  job_id?: string | null;
  provider?: string;
  duration_ms?: number;
  status?: number;
  error_code?: string;
  [key: string]: unknown;
};

const SENSITIVE_KEYS = new Set([
  'password',
  'secret',
  'token',
  'api_key',
  'apikey',
  'authorization',
  'cookie',
  'set-cookie',
  'card',
  'number',
  'cvc',
  'cvv',
  'ssn',
  'cpf'
]);

const isProd = process.env.NODE_ENV === 'production';
const service = 'sr-digital';
const environment = process.env.DEPLOY_ENV ?? process.env.NODE_ENV ?? 'unknown';

function redact<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redact) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) out[k] = '***';
    else out[k] = redact(v);
  }
  return out as T;
}

function emit(level: LogLevel, message: string, ctx?: LogContext) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    service,
    environment,
    message,
    ...(ctx ? redact(ctx) : {})
  };
  const line = JSON.stringify(record);
  if (isProd || level === 'error' || level === 'fatal') {
    // eslint-disable-next-line no-console
    console[level === 'debug' || level === 'info' ? 'log' : 'error'](line);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[${level}] ${message}`, ctx ?? '');
  }
}

export const logger = {
  debug: (m: string, c?: LogContext) => emit('debug', m, c),
  info:  (m: string, c?: LogContext) => emit('info', m, c),
  warn:  (m: string, c?: LogContext) => emit('warn', m, c),
  error: (m: string, c?: LogContext) => emit('error', m, c),
  fatal: (m: string, c?: LogContext) => emit('fatal', m, c)
};
