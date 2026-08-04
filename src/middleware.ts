import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { EXTERNAL_ROLES, INTERNAL_ROLES } from '@/lib/permissions/roles';
import type { UserRole } from '@/types/database';

// Routes accessible without authentication
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/api/health'
];

// Prefixes only accessible to internal staff
const INTERNAL_PREFIXES = ['/dashboard', '/crm', '/casos', '/producao', '/financeiro'];

// Prefixes only accessible to dentists
const DENTIST_PREFIXES = ['/portal'];

// Where each role lands after login
const HOME_INTERNAL = '/dashboard';
const HOME_DENTIST  = '/portal';
const CHANGE_PW     = '/change-password';

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  // Public site assets and marketing pages: everything not under app groups above.
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/favicon')) return true;
  return false;
}

function matchesAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  // If Supabase isn't configured yet, don't try to auth — just pass through.
  // Route handlers/pages themselves render friendly "coming soon" screens.
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  const { response, supabase, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!supabase) {
    return response;
  }

  // --- Unauthenticated users ---
  if (!user) {
    // Anonymous access to protected areas → redirect to /login
    if (matchesAny(pathname, INTERNAL_PREFIXES) || matchesAny(pathname, DENTIST_PREFIXES) || pathname === CHANGE_PW) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  // --- Authenticated: fetch minimum profile info to route by role ---
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status, must_change_password')
    .eq('id', user.id)
    .maybeSingle<{ role: UserRole; status: string; must_change_password: boolean }>();

  if (!profile) {
    // No profile row → sign the user out; treat as anonymous.
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
  const isDentist  = EXTERNAL_ROLES.includes(role);

  // Force password change flow if flag is set
  if (profile.must_change_password && pathname !== CHANGE_PW) {
    const url = request.nextUrl.clone();
    url.pathname = CHANGE_PW;
    return NextResponse.redirect(url);
  }

  // Prevent authenticated users from landing on /login again
  if (pathname === '/login' || pathname === '/forgot-password') {
    const url = request.nextUrl.clone();
    url.pathname = isDentist ? HOME_DENTIST : HOME_INTERNAL;
    return NextResponse.redirect(url);
  }

  // Cross-area access control
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
    /*
     * Match all request paths except:
     * - static files (_next/static, _next/image)
     * - favicon and image files
     * - the public root html/text assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};
