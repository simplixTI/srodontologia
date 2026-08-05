import 'server-only';
import type { CaptchaContext, CaptchaProvider, CaptchaVerifyResult } from './types';
import { createTurnstileProvider } from './providers/turnstile';
import { createMockCaptchaProvider } from './providers/mock';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Resolves the active CAPTCHA provider. Turnstile when both env vars are set;
 * otherwise mock (dev + CI). Falling back to mock is loud in logs.
 */
export function resolveCaptchaProvider(): CaptchaProvider {
  if (process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    return createTurnstileProvider();
  }
  return createMockCaptchaProvider();
}

/**
 * Verifies a captcha token and records an abuse-flavored security_event on
 * repeated failures for the same ip/email combo. Never throws — returns a
 * structured result the caller can inspect.
 */
export async function verifyCaptcha(input: {
  token: string;
  remoteIp?: string | null;
  context: CaptchaContext;
  identifier?: string | null;   // e.g. email being attacked
}): Promise<CaptchaVerifyResult> {
  const provider = resolveCaptchaProvider();
  const result = await provider.verify({ token: input.token, remoteIp: input.remoteIp });

  if (!result.ok) {
    // Best-effort audit
    try {
      const admin = createSupabaseAdminClient();
      await admin.from('security_events').insert({
        event_type: 'captcha_failed',
        ip: input.remoteIp ?? null,
        metadata: {
          context: input.context,
          provider: result.provider,
          error_codes: result.errorCodes,
          reason: result.reason,
          identifier: input.identifier ? maskEmail(input.identifier) : null
        }
      });
    } catch {
      // audit is best-effort
    }
  }

  return result;
}

function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at < 1) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at);
  return `${local[0]}***${local.length > 2 ? local[local.length - 1] : ''}${domain}`;
}

/**
 * Threshold-based decision: should the caller require CAPTCHA for this
 * identifier? Reads recent security_events. Progressive enforcement:
 *   - 0..2 failures in last hour → captcha optional
 *   - 3+ failures                → captcha required
 *   - 10+ failures                → temporary block (caller decides duration)
 */
export type AbuseDecision = {
  requireCaptcha: boolean;
  blocked: boolean;
  recentFailures: number;
};

export async function evaluateAbuseFor(input: {
  ip?: string | null;
  email?: string | null;
  windowMinutes?: number;
}): Promise<AbuseDecision> {
  try {
    const admin = createSupabaseAdminClient();
    const since = new Date(Date.now() - (input.windowMinutes ?? 60) * 60_000).toISOString();
    const orFilters: string[] = [];
    if (input.ip) orFilters.push(`ip.eq.${input.ip}`);
    if (input.email) orFilters.push(`metadata->>identifier.ilike.%${maskEmail(input.email)}%`);
    const q = admin
      .from('security_events')
      .select('id', { count: 'exact', head: true })
      .in('event_type', ['login_failed', 'captcha_failed', 'signup_rate_limited'])
      .gte('created_at', since);
    if (orFilters.length) q.or(orFilters.join(','));
    const { count } = await q;
    const n = count ?? 0;
    return {
      recentFailures: n,
      requireCaptcha: n >= 3,
      blocked: n >= 10
    };
  } catch {
    return { requireCaptcha: false, blocked: false, recentFailures: 0 };
  }
}
