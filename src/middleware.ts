import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { EXTERNAL_ROLES, INTERNAL_ROLES } from '@/lib/permissions/roles';
import type { UserRole } from '@/types/database';

// Header propagated to Server Components for hostname-based tenant resolution.
// Middleware runs on the edge and cannot hit the DB; layouts (Node runtime)
// consume this + call resolveTenantFromHostname() to fetch the real tenant.
const HOSTNAME_HEADER = 'x-sr-hostname';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/signup',
  '/termos',
  '/privacidade',
  '/cookies',
  '/seguranca',
  '/status',
  '/api/health'
];

const INTERNAL_PREFIXES = ['/dashboard', '/crm', '/casos', '/producao', '/financeiro'];
const DENTIST_PREFIXES = ['/portal'];
const PLATFORM_PREFIXES = ['/super-admin'];

const HOME_INTERNAL = '/dashboard';
const HOME_DENTIST = '/portal';
const CHANGE_PW = '/change-password';

const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'api', 'admin', 'super-admin', 'super', 'dashboard',
  'portal', 'help', 'docs', 'status', 'signup', 'login', 'auth',
  'mail', 'billing'
]);

function normalizeHostname(raw: string | null): string | null {
  if (!raw) return null;
  let s = raw.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '');
  s = s.split('/')[0];
  s = s.split(':')[0];
  if (!/^[a-z0-9.-]+$/.test(s)) return null;
  if (s.length > 253) return null;
  return s;
}

function matchesAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isReservedSubdomain(host: string, base: string): boolean {
  if (!base || !host.endsWith(`.${base}`)) return false;
  const slug = host.slice(0, host.length - base.length - 1);
  return RESERVED_SUBDOMAINS.has(slug.split('.').pop() ?? '');
}

export async function middleware(request: NextRequest) {
  const { pathname: earlyPath } = request.nextUrl;

  // Public API + cron + billing webhooks: never touch session cookies.
  if (
    earlyPath.startsWith('/api/v1/') ||
    earlyPath.startsWith('/api/cron') ||
    earlyPath.startsWith('/api/webhooks/')
  ) {
    return NextResponse.next({ request });
  }

  // Normalize + propagate hostname so Server Components can resolve tenant.
  const rawHost = request.headers.get('host');
  const hostname = normalizeHostname(rawHost);
  const requestHeaders = new Headers(request.headers);
  if (hostname) requestHeaders.set(HOSTNAME_HEADER, hostname);

  // Guard against host header injection: reject if host contains suspicious chars
  if (rawHost && !hostname) {
    return NextResponse.json({ ok: false, error: 'invalid_host' }, { status: 400 });
  }

  // Reserved subdomains of the platform must not resolve to a tenant scope for
  // routes that are tenant-scoped. Anonymous surface unaffected.
  const platformBase = normalizeHostname(process.env.NEXT_PUBLIC_APP_URL ?? '');
  if (hostname && platformBase && isReservedSubdomain(hostname, platformBase)) {
    // Only flags; no rewrite. Layouts decide how to handle.
    requestHeaders.set('x-sr-reserved-subdomain', '1');
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const { response, supabase, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Propagate hostname header into the outbound response too
  response.headers.set(HOSTNAME_HEADER, hostname ?? '');

  if (!supabase) return response;

  if (!user) {
    if (matchesAny(pathname, INTERNAL_PREFIXES) || matchesAny(pathname, DENTIST_PREFIXES) || pathname === CHANGE_PW) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status, must_change_password, platform_role')
    .eq('id', user.id)
    .maybeSingle<{ role: UserRole; status: string; must_change_password: boolean; platform_role: string | null }>();

  if (!profile) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (profile.status !== 'active') {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('reason', 'inactive');
    return NextResponse.redirect(url);
  }

  const role = profile.role as UserRole;
  const isInternal = INTERNAL_ROLES.includes(role);
  const isDentist = EXTERNAL_ROLES.includes(role);
  const isPlatform = profile.platform_role === 'super' || profile.platform_role === 'support';

  if (profile.must_change_password && pathname !== CHANGE_PW) {
    const url = request.nextUrl.clone();
    url.pathname = CHANGE_PW;
    return NextResponse.redirect(url);
  }

  if (pathname === '/login' || pathname === '/forgot-password') {
    const url = request.nextUrl.clone();
    url.pathname = isDentist ? HOME_DENTIST : HOME_INTERNAL;
    return NextResponse.redirect(url);
  }

  if (matchesAny(pathname, PLATFORM_PREFIXES) && !isPlatform) {
    const url = request.nextUrl.clone();
    url.pathname = isDentist ? HOME_DENTIST : HOME_INTERNAL;
    return NextResponse.redirect(url);
  }
  if (matchesAny(pathname, INTERNAL_PREFIXES) && !isInternal) {
    const url = request.nextUrl.clone();
    url.pathname = HOME_DENTIST;
    return NextResponse.redirect(url);
  }
  if (matchesAny(pathname, DENTIST_PREFIXES) && !isDentist) {
    const url = request.nextUrl.clone();
    url.pathname = HOME_INTERNAL;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};

// Ensure this stays public for tests that check what's whitelisted.
export const PUBLIC_ROUTES = PUBLIC_PATHS;
