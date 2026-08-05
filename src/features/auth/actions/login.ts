'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validations/auth';
import { homeRouteForRole } from '@/lib/permissions/roles';
import { rateLimit } from '@/lib/rate-limit';
import { recordSession } from '@/lib/sessions/registry';
import type { UserRole } from '@/types/database';

export type LoginState = {
  ok: boolean;
  error?: string;
};

export async function loginAction(
  _prev: LoginState | undefined,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password')
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  // Rate limit: 8 tentativas por 5min por (IP + email) para desacelerar
  // ataques de força bruta sem punir usuários reais que erram a senha.
  const h = headers();
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    'unknown';
  const rl = rateLimit(`login:${ip}:${parsed.data.email}`, {
    max: 8,
    windowMs: 5 * 60_000
  });
  if (!rl.ok) {
    return {
      ok: false,
      error: `Muitas tentativas. Tente novamente em ${rl.retryAfter}s.`
    };
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password
  });

  if (error || !data.user) {
    return { ok: false, error: 'E-mail ou senha inválidos.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status, must_change_password')
    .eq('id', data.user.id)
    .maybeSingle<{ role: UserRole; status: string; must_change_password: boolean }>();

  if (!profile) {
    await supabase.auth.signOut();
    return { ok: false, error: 'Conta sem perfil vinculado. Contate o administrador.' };
  }

  if (profile.status !== 'active') {
    await supabase.auth.signOut();
    return { ok: false, error: 'Sua conta está inativa. Contate o administrador.' };
  }

  await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', data.user.id);

  // Register the session in our own registry (visibility + revocation layer)
  await recordSession({
    userId: data.user.id,
    sessionIdentifier: data.session?.refresh_token ?? data.session?.access_token ?? data.user.id,
    userAgent: h.get('user-agent'),
    ip
  });

  const next = profile.must_change_password
    ? '/change-password'
    : homeRouteForRole(profile.role as UserRole);

  redirect(next);
}
