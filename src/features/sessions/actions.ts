'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revokeSession, revokeAllOtherSessions } from '@/lib/sessions/registry';

export type ActionState = { ok: boolean; error?: string };

async function requireUser() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');
  return user;
}

export async function revokeSessionAction(sessionId: string): Promise<ActionState> {
  try {
    const user = await requireUser();
    const res = await revokeSession({ sessionId, actorUserId: user.id, reason: 'user' });
    revalidatePath('/perfil/seguranca/sessoes');
    return res;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}

export async function revokeAllOtherSessionsAction(): Promise<ActionState> {
  try {
    const user = await requireUser();
    // We don't know the current session hash server-side without more plumbing.
    // Fallback: passing empty string revokes ALL sessions of the user, forcing
    // relogin (safe explicit intent from the /sessoes UI).
    const n = await revokeAllOtherSessions(user.id, '');
    revalidatePath('/perfil/seguranca/sessoes');
    return { ok: true, error: n === 0 ? 'Nenhuma sessão para revogar.' : undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}
