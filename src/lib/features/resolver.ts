import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Server-side feature flag resolver.
 *
 * Cascade precedence (highest wins):
 *   1. user override
 *   2. role override
 *   3. tenant override
 *   4. plan override
 *   5. default_enabled
 *
 * Uses the SECURITY DEFINER RPC created in migration 0039.
 */
export async function isFeatureEnabled(
  flagKey: string,
  ctx: { organizationId?: string | null; userId?: string | null; role?: string | null }
): Promise<boolean> {
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.rpc('check_feature_flag', {
      p_flag_key: flagKey,
      p_org_id: ctx.organizationId ?? null,
      p_user_id: ctx.userId ?? null,
      p_role: ctx.role ?? null
    });
    return Boolean(data);
  } catch {
    return false;
  }
}

/**
 * Resolves multiple flags for the same context in one round-trip.
 * Convenient for pages that render several conditional widgets.
 */
export async function resolveFeatureFlags(
  keys: string[],
  ctx: { organizationId?: string | null; userId?: string | null; role?: string | null }
): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  await Promise.all(keys.map(async (k) => {
    out[k] = await isFeatureEnabled(k, ctx);
  }));
  return out;
}
