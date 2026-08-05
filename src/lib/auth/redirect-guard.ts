import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Open-redirect defense. All `?next=` / `?redirect=` handling must go
 * through this. Only accepts:
 *   1. Relative paths starting with `/` (never `//` — protocol-relative)
 *   2. Absolute URLs whose hostname is in the platform's allowlist:
 *      - NEXT_PUBLIC_APP_URL host
 *      - Any tenant subdomain of that host
 *      - Any verified/active row in tenant_domains
 *
 * On rejection, returns a safe default (e.g. `/dashboard`).
 */

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { allowed: boolean; expires: number }>();

export async function safeRedirect(
  raw: string | null | undefined,
  fallback: string
): Promise<string> {
  const s = (raw ?? '').trim();
  if (!s) return fallback;

  // 1) Relative path — safe. But block protocol-relative //evil.com
  if (s.startsWith('/') && !s.startsWith('//')) {
    return s;
  }

  // 2) Absolute URL — validate host
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return fallback;
    if (await isAllowedHost(u.hostname)) {
      return u.pathname + u.search + u.hash || '/';
    }
  } catch {
    return fallback;
  }
  return fallback;
}

async function isAllowedHost(hostname: string): Promise<boolean> {
  const key = hostname.toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.allowed;

  const value = await checkHost(key);
  cache.set(key, { allowed: value, expires: Date.now() + CACHE_TTL_MS });
  return value;
}

async function checkHost(hostname: string): Promise<boolean> {
  const platformBase = (process.env.NEXT_PUBLIC_APP_URL ?? '')
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0]
    .toLowerCase();

  if (!platformBase) return false;
  if (hostname === platformBase) return true;
  if (hostname.endsWith(`.${platformBase}`)) return true;

  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from('tenant_domains')
      .select('id')
      .eq('hostname', hostname)
      .in('status', ['verified', 'active', 'ssl_active'])
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}
