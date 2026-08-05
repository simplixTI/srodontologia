import { z } from 'zod';

/**
 * Environment schema. Divide em:
 *   - server-only (nunca no bundle client)
 *   - client-safe (`NEXT_PUBLIC_*`)
 *
 * Falha cedo em produção quando faltar env obrigatória.
 * Em dev, apenas loga aviso (não bloqueia o `next dev`).
 */

const serverSchema = z.object({
  // Supabase (obrigatório sempre)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),

  // Cron
  CRON_SECRET: z.string().min(16).optional(),

  // Billing (opcional em dev; obrigatório para checkout real)
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),

  // Email (opcional; queda para console.log)
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_PROVIDER: z.enum(['resend', 'sendgrid', 'postmark', 'ses']).optional(),

  // AI providers (opcionais; queda para mock)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),

  // Rate-limit distribuído (opcional)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Error tracking (opcional)
  SENTRY_DSN: z.string().url().optional(),

  // Ambiente
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DEPLOY_ENV: z.enum(['local', 'preview', 'staging', 'production']).default('local')
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_APP_URL: z.string().url().optional()
});

let serverParsed: z.infer<typeof serverSchema> | null = null;
let clientParsed: z.infer<typeof clientSchema> | null = null;

export function loadServerEnv(): z.infer<typeof serverSchema> {
  if (serverParsed) return serverParsed;
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Invalid environment (server):\n${issues}`);
    }
    // eslint-disable-next-line no-console
    console.warn('[env] server env warnings (non-blocking in dev):\n', issues);
    serverParsed = serverSchema.parse({
      ...process.env,
      NODE_ENV: process.env.NODE_ENV ?? 'development',
      DEPLOY_ENV: process.env.DEPLOY_ENV ?? 'local',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'x'.repeat(30)
    });
    return serverParsed;
  }
  serverParsed = result.data;
  return serverParsed;
}

export function loadClientEnv(): z.infer<typeof clientSchema> {
  if (clientParsed) return clientParsed;
  const result = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
  });
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    if (typeof window !== 'undefined') {
      throw new Error(`Invalid environment (client):\n${issues}`);
    }
    // eslint-disable-next-line no-console
    console.warn('[env] client env warnings:', issues);
  }
  clientParsed = result.success ? result.data : ({} as z.infer<typeof clientSchema>);
  return clientParsed;
}

/** Convenience booleans consumed by services to decide adapter to use. */
export const featureConfigured = {
  get stripe() { return !!process.env.STRIPE_SECRET_KEY; },
  get stripeWebhook() { return !!process.env.STRIPE_WEBHOOK_SECRET; },
  get upstash() { return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN; },
  get sentry() { return !!process.env.SENTRY_DSN; },
  get email() { return !!process.env.EMAIL_API_KEY; }
};
