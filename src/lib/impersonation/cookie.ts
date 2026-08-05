import 'server-only';
import { cookies } from 'next/headers';

/**
 * Impersonation cookie helpers (sync). Kept out of the 'use server' file
 * because Next 14 Server Actions files may only export async functions.
 */
export const IMPERSONATION_COOKIE = 'sr_impersonation';

export function readImpersonationCookie(): { id: string; token: string } | null {
  const c = cookies().get(IMPERSONATION_COOKIE)?.value;
  if (!c) return null;
  const [id, token] = c.split('.');
  if (!id || !token) return null;
  return { id, token };
}
