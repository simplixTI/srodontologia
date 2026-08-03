import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Privileged Supabase client using the SERVICE ROLE key.
 *
 * ⚠️  NEVER import this into Client Components or any file that runs in the browser.
 * ⚠️  NEVER expose the returned client to route handlers that echo response data
 *     without careful auth checks — it bypasses Row Level Security entirely.
 *
 * Use only from:
 *  - trusted server actions
 *  - background scripts (see scripts/create-admin.mjs)
 *  - webhooks that need to write on behalf of the system
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Admin client cannot be created.'
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
