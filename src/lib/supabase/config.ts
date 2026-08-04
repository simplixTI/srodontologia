/**
 * Runtime check to know whether Supabase is fully configured.
 * Accepts both naming conventions:
 *  - NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY   (manual setup)
 *  - SUPABASE_URL / SUPABASE_ANON_KEY                            (Vercel-Supabase integration)
 *
 * On the server both are readable. On the browser only NEXT_PUBLIC_* are
 * available, so the client Supabase call sites also need those to be set
 * for interactive features to work.
 */

export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
}

export function getSupabaseAnonKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
