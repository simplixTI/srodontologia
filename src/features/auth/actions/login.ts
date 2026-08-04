'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validations/auth';
import { homeRouteForRole } from '@/lib/permissions/roles';
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

  const next = profile.must_change_password
    ? '/change-password'
    : homeRouteForRole(profile.role as UserRole);

  redirect(next);
}
