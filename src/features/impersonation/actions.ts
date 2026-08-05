'use server';

import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requirePlatformUser } from '@/lib/permissions/platform';

export type ActionState = { ok: boolean; error?: string };

const IMPERSONATION_COOKIE = 'sr_impersonation';

const startSchema = z.object({
  tenantId: z.string().uuid(),
  reason: z.string().min(3).max(500)
});

/**
 * Starts an impersonation session. Records to `impersonation_sessions` +
 * writes a signed cookie the app reads to override org_id at runtime.
 *
 * Only platform admins can call this. Reason is mandatory (audit).
 */
export async function startImpersonationAction(input: unknown): Promise<ActionState> {
  try {
    const parsed = startSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    const actor = await requirePlatformUser();

    const h = headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    const ua = h.get('user-agent') ?? null;

    const admin = createSupabaseAdminClient();
    const token = `imp_${randomBytes(24).toString('base64url')}`;

    const { data, error } = await admin
      .from('impersonation_sessions')
      .insert({
        actor_id: actor.id,
        target_org_id: parsed.data.tenantId,
        reason: parsed.data.reason,
        ip,
        user_agent: ua,
        session_token: token
      })
      .select('id')
      .single<{ id: string }>();
    if (error || !data) return { ok: false, error: error?.message ?? 'Falha.' };

    // Audit
    await admin.from('security_events').insert({
      organization_id: parsed.data.tenantId,
      user_id: actor.id,
      event_type: 'impersonation_started',
      ip,
      user_agent: ua,
      metadata: { session_id: data.id, reason: parsed.data.reason }
    });

    cookies().set(IMPERSONATION_COOKIE, `${data.id}.${token}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 2 // 2h
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
  redirect('/dashboard');
}

export async function stopImpersonationAction(): Promise<void> {
  const c = cookies();
  const cookie = c.get(IMPERSONATION_COOKIE)?.value;
  if (cookie) {
    const [id] = cookie.split('.');
    const admin = createSupabaseAdminClient();
    await admin
      .from('impersonation_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', id);
    await admin.from('security_events').insert({
      user_id: (await requirePlatformUser().catch(() => null))?.id ?? null,
      event_type: 'impersonation_ended',
      metadata: { session_id: id }
    });
  }
  c.delete(IMPERSONATION_COOKIE);
  revalidatePath('/');
  redirect('/super-admin/tenants');
}

/** Reads active impersonation from cookie (used by layouts to show banner). */
export function readImpersonationCookie(): { id: string; token: string } | null {
  const c = cookies().get(IMPERSONATION_COOKIE)?.value;
  if (!c) return null;
  const [id, token] = c.split('.');
  if (!id || !token) return null;
  return { id, token };
}
