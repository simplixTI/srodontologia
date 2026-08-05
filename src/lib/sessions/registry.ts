import 'server-only';
import { createHash } from 'crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/observability/logger';

/**
 * Application-level session registry. Complementary to Supabase Auth —
 * we cannot list sessions across devices via Supabase's API, so we mirror
 * activity into `app_sessions` for visibility + audit + revocation checks.
 *
 * Access tokens are NEVER stored; we hash the refresh token id or a stable
 * cookie-scoped identifier.
 */

export type SessionContext = {
  userId: string;
  organizationId?: string | null;
  sessionIdentifier: string;   // stable per-session (opaque)
  userAgent?: string | null;
  ip?: string | null;
};

/**
 * Records or updates the current session. Called from server actions after
 * a successful login. Safe to call on every request (last_seen_at update).
 */
export async function recordSession(ctx: SessionContext): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const sessionHash = createHash('sha256').update(ctx.sessionIdentifier).digest('hex');
    const ua = parseUA(ctx.userAgent ?? '');
    const ipHash = ctx.ip ? hashIp(ctx.ip) : null;

    // Try update-or-insert without a UUID collision path
    const { data: existing } = await admin
      .from('app_sessions')
      .select('id')
      .eq('user_id', ctx.userId)
      .eq('session_hash', sessionHash)
      .is('revoked_at', null)
      .maybeSingle<{ id: string }>();

    if (existing) {
      await admin.from('app_sessions').update({
        last_seen_at: new Date().toISOString(),
        organization_id: ctx.organizationId ?? null
      }).eq('id', existing.id);
      return;
    }

    await admin.from('app_sessions').insert({
      user_id: ctx.userId,
      organization_id: ctx.organizationId ?? null,
      session_hash: sessionHash,
      user_agent: (ctx.userAgent ?? '').slice(0, 500),
      device_kind: ua.device,
      browser: ua.browser,
      os: ua.os,
      ip_hash: ipHash,
      is_current: true,
      expires_at: new Date(Date.now() + 30 * 24 * 3600_000).toISOString() // 30d ballpark
    });
  } catch (err) {
    logger.warn('recordSession failed', { err: (err as Error).message });
  }
}

/**
 * Marks a session as revoked. Actual token invalidation depends on the
 * user re-authenticating (or on Supabase's own refresh cycle catching up).
 * Middleware/guards read the flag on subsequent requests.
 */
export async function revokeSession(input: {
  sessionId: string;
  actorUserId: string;
  reason?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createSupabaseAdminClient();
    const { data: sess } = await admin
      .from('app_sessions')
      .select('id, user_id')
      .eq('id', input.sessionId)
      .maybeSingle<{ id: string; user_id: string }>();
    if (!sess) return { ok: false, error: 'session_not_found' };
    if (sess.user_id !== input.actorUserId) return { ok: false, error: 'forbidden' };

    await admin.from('app_sessions').update({
      revoked_at: new Date().toISOString(),
      revoke_reason: input.reason ?? 'user'
    }).eq('id', sess.id);

    await admin.from('security_events').insert({
      user_id: sess.user_id,
      event_type: 'session_revoked',
      metadata: { session_id: sess.id, reason: input.reason ?? 'user' }
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'error' };
  }
}

export async function revokeAllOtherSessions(
  userId: string,
  keepSessionHash: string
): Promise<number> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('app_sessions')
    .select('id')
    .eq('user_id', userId)
    .neq('session_hash', keepSessionHash)
    .is('revoked_at', null);
  const ids = (data ?? []).map((r) => (r as { id: string }).id);
  if (ids.length === 0) return 0;

  await admin.from('app_sessions').update({
    revoked_at: new Date().toISOString(),
    revoke_reason: 'user_all_others'
  }).in('id', ids);

  await admin.from('security_events').insert({
    user_id: userId,
    event_type: 'sessions_bulk_revoked',
    metadata: { count: ids.length }
  });
  return ids.length;
}

function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? 'sr-digital-dev-salt';
  return createHash('sha256').update(ip + salt).digest('hex').slice(0, 32);
}

function parseUA(ua: string): { device: string; browser: string; os: string } {
  const u = ua.toLowerCase();
  const device = /mobile/i.test(ua) ? 'mobile'
    : /tablet|ipad/i.test(ua) ? 'tablet'
    : ua ? 'desktop' : 'other';
  const browser =
    /firefox/.test(u) ? 'Firefox' :
    /edg\//.test(u) ? 'Edge' :
    /chrome/.test(u) && !/edg\//.test(u) ? 'Chrome' :
    /safari/.test(u) && !/chrome/.test(u) ? 'Safari' :
    'Outro';
  const os =
    /windows/.test(u) ? 'Windows' :
    /mac os|macos/.test(u) ? 'macOS' :
    /android/.test(u) ? 'Android' :
    /iphone|ipad|ios/.test(u) ? 'iOS' :
    /linux/.test(u) ? 'Linux' : 'Outro';
  return { device, browser, os };
}
