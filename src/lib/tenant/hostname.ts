import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Resolves a tenant from a request hostname. Priority:
 *   1) verified custom domain (tenant_domains.hostname = X, status IN verified/active)
 *   2) subdomain of the platform base (e.g. `acme.srdigital.com.br` → slug=acme)
 *   3) null (fall back to platform default)
 *
 * Security notes:
 *   - `Host` header is untrusted. Callers should pass the header directly;
 *     this function does NOT infer from anywhere else.
 *   - Cached with process-level LRU (30s TTL) to avoid hitting DB on every SSR call.
 */
export type ResolvedTenant = {
  organizationId: string;
  source: 'custom_domain' | 'subdomain' | 'platform_default';
  hostname: string;
};

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { value: ResolvedTenant | null; expires: number }>();

export async function resolveTenantFromHostname(
  rawHostname: string | null | undefined
): Promise<ResolvedTenant | null> {
  const host = normalizeHostname(rawHostname);
  if (!host) return null;

  const cached = cache.get(host);
  if (cached && cached.expires > Date.now()) return cached.value;

  const value = await resolveInner(host);
  cache.set(host, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
}

async function resolveInner(host: string): Promise<ResolvedTenant | null> {
  const admin = createSupabaseAdminClient();
  const platformBase = normalizeHostname(process.env.NEXT_PUBLIC_APP_URL ?? '');

  // 1) custom domain (verified/active)
  const { data: cd } = await admin
    .from('tenant_domains')
    .select('organization_id, status')
    .eq('hostname', host)
    .in('status', ['verified', 'active'])
    .maybeSingle<{ organization_id: string; status: string }>();
  if (cd) return { organizationId: cd.organization_id, source: 'custom_domain', hostname: host };

  // 2) subdomain of platform
  if (platformBase && host.endsWith(`.${platformBase}`)) {
    const slug = host.slice(0, host.length - platformBase.length - 1);
    if (slug && !RESERVED_SUBDOMAINS.has(slug)) {
      const { data: org } = await admin
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .is('deleted_at', null)
        .maybeSingle<{ id: string }>();
      if (org) return { organizationId: org.id, source: 'subdomain', hostname: host };
    }
  }

  return null;
}

function normalizeHostname(v: string | null | undefined): string | null {
  if (!v) return null;
  let s = v.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '');
  s = s.split('/')[0];
  s = s.split(':')[0];
  if (!/^[a-z0-9.-]+$/.test(s)) return null;
  return s;
}

/** Subdomains that must never resolve to a tenant. */
const RESERVED_SUBDOMAINS = new Set([
  'www',
  'app',
  'api',
  'admin',
  'super-admin',
  'super',
  'dashboard',
  'portal',
  'help',
  'docs',
  'status',
  'signup',
  'login',
  'auth',
  'mail',
  'billing'
]);
