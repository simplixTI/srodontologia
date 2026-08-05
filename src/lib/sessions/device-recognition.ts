import 'server-only';
import { createHash } from 'crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getClock } from '@/lib/time/clock';
import { logger } from '@/lib/observability/logger';

/**
 * Recognises a device from a session context. If we've never seen this
 * (user, device_key) tuple before, records it and enqueues a `device_alert`
 * job so an email is dispatched. Existing devices bump `last_seen_at` +
 * `login_count`.
 *
 * device_key is a coarse fingerprint: sha256 of (browser_family + os + ip_class + salt).
 * We DO NOT store full IPs — IP class means the /16 prefix, which is enough
 * to detect "user came from a totally different network" without over-
 * identifying a specific device.
 */

const SALT = process.env.IP_HASH_SALT ?? 'sr-digital-dev-salt';

export type RecognitionInput = {
  userId: string;
  userAgent?: string | null;
  ip?: string | null;
};

export type RecognitionResult = {
  deviceKey: string;
  isNew: boolean;
  loginCount: number;
};

export async function recogniseDevice(ctx: RecognitionInput): Promise<RecognitionResult> {
  const admin = createSupabaseAdminClient();
  const ua = classifyUA(ctx.userAgent ?? '');
  const ipClass = classifyIp(ctx.ip);
  const deviceKey = fingerprint(ua.browser, ua.os, ipClass);

  const { data: existing } = await admin
    .from('device_recognition')
    .select('id, login_count')
    .eq('user_id', ctx.userId)
    .eq('device_key', deviceKey)
    .maybeSingle<{ id: string; login_count: number }>();

  const nowIso = getClock().now().toISOString();

  if (existing) {
    const newCount = existing.login_count + 1;
    await admin
      .from('device_recognition')
      .update({ last_seen_at: nowIso, login_count: newCount })
      .eq('id', existing.id);
    return { deviceKey, isNew: false, loginCount: newCount };
  }

  const { error } = await admin.from('device_recognition').insert({
    user_id: ctx.userId,
    device_key: deviceKey,
    first_seen_at: nowIso,
    last_seen_at: nowIso,
    login_count: 1
  });

  if (error) {
    // Race with concurrent login for same fingerprint — treat as known.
    logger.warn('device_recognition insert lost race', { userId: ctx.userId, err: error.message });
    return { deviceKey, isNew: false, loginCount: 1 };
  }

  await admin.from('security_events').insert({
    user_id: ctx.userId,
    event_type: 'new_device_login',
    metadata: {
      device_key: deviceKey.slice(0, 12),
      browser: ua.browser,
      os: ua.os,
      user_agent_snippet: (ctx.userAgent ?? '').slice(0, 200)
    }
  });

  await enqueueDeviceAlert(admin, ctx.userId, { browser: ua.browser, os: ua.os });

  return { deviceKey, isNew: true, loginCount: 1 };
}

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

async function enqueueDeviceAlert(
  admin: AdminClient,
  userId: string,
  info: { browser: string; os: string }
) {
  const { data: profile } = await admin
    .from('profiles')
    .select('organization_id, email, full_name')
    .eq('id', userId)
    .maybeSingle<{ organization_id: string | null; email: string; full_name: string | null }>();

  if (!profile?.organization_id) return; // no tenant → cannot enqueue

  await admin.from('jobs').insert({
    organization_id: profile.organization_id,
    kind: 'device_alert',
    priority: 3,
    payload: {
      user_id: userId,
      email: profile.email,
      full_name: profile.full_name,
      browser: info.browser,
      os: info.os,
      detected_at: getClock().now().toISOString()
    }
  });
}

function classifyUA(ua: string): { browser: string; os: string } {
  const u = ua.toLowerCase();
  const browser =
    /firefox/.test(u) ? 'Firefox' :
    /edg\//.test(u) ? 'Edge' :
    /chrome/.test(u) && !/edg\//.test(u) ? 'Chrome' :
    /safari/.test(u) && !/chrome/.test(u) ? 'Safari' :
    'Other';
  const os =
    /windows/.test(u) ? 'Windows' :
    /mac os|macos/.test(u) ? 'macOS' :
    /android/.test(u) ? 'Android' :
    /iphone|ipad|ios/.test(u) ? 'iOS' :
    /linux/.test(u) ? 'Linux' : 'Other';
  return { browser, os };
}

/**
 * Coarsens an IP to a /16 prefix for IPv4 or /48 for IPv6.
 * Purpose: detect "same neighbourhood" without pinning to a specific IP.
 */
function classifyIp(ip: string | null | undefined): string {
  if (!ip) return 'unknown';
  const trimmed = ip.trim();
  if (trimmed.includes(':')) {
    // IPv6 — first 3 hextets
    return trimmed.split(':').slice(0, 3).join(':');
  }
  const parts = trimmed.split('.');
  if (parts.length !== 4) return 'invalid';
  return `${parts[0]}.${parts[1]}`;
}

function fingerprint(browser: string, os: string, ipClass: string): string {
  return createHash('sha256').update(`${browser}|${os}|${ipClass}|${SALT}`).digest('hex').slice(0, 32);
}

/** Exported for testing without hitting Supabase. */
export const _internal = { classifyIp, classifyUA, fingerprint };
