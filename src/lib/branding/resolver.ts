import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type TenantBranding = {
  brand_name: string;
  primary_color: string;    // hex
  accent_color: string;     // hex
  logo_url: string | null;
  favicon_url: string | null;
  email_from_name: string;
  portal_greeting: string;
};

export const DEFAULT_BRANDING: TenantBranding = {
  brand_name: 'SR Digital',
  primary_color: '#0a0a0a',
  accent_color: '#F0DEA9',
  logo_url: null,
  favicon_url: null,
  email_from_name: 'SR Digital',
  portal_greeting: 'Bem-vindo ao seu portal.'
};

/**
 * Fetches branding for the caller's organization. Falls back to DEFAULT_BRANDING
 * when the caller has no org (public pages) or when branding is empty.
 */
export async function resolveBranding(): Promise<TenantBranding> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_BRANDING;
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string }>();
  if (!profile?.organization_id) return DEFAULT_BRANDING;
  return resolveBrandingForOrg(profile.organization_id);
}

export async function resolveBrandingForOrg(organizationId: string): Promise<TenantBranding> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('organizations')
    .select('name, branding')
    .eq('id', organizationId)
    .maybeSingle<{ name: string; branding: Partial<TenantBranding> | null }>();
  if (!data) return DEFAULT_BRANDING;
  const b = data.branding ?? {};
  return {
    brand_name: b.brand_name ?? data.name ?? DEFAULT_BRANDING.brand_name,
    primary_color: b.primary_color ?? DEFAULT_BRANDING.primary_color,
    accent_color: b.accent_color ?? DEFAULT_BRANDING.accent_color,
    logo_url: b.logo_url ?? null,
    favicon_url: b.favicon_url ?? null,
    email_from_name: b.email_from_name ?? data.name ?? DEFAULT_BRANDING.email_from_name,
    portal_greeting: b.portal_greeting ?? DEFAULT_BRANDING.portal_greeting
  };
}
