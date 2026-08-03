/**
 * Runtime check to know whether Supabase is fully configured.
 * Everything in the SR HUB gracefully degrades to a "coming soon"
 * screen when this returns false, so the public marketing site
 * keeps working even before the backend env vars are set on the host.
 */

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
