'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { changePasswordSchema } from '@/lib/validations/auth';
import { homeRouteForRole } from '@/lib/permissions/roles';
import type { UserRole } from '@/types/database';

export type ChangeState = {
  ok: boolean;
  error?: string;
};

export async function changePasswordAction(
  _prev: ChangeState | undefined,
  formData: FormData
): Promise<ChangeState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword')
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const supabase = createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  // Re-authenticate to prove ownership of the current password
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword
  });
  if (reauthError) {
    return { ok: false, error: 'Senha atual incorreta.' };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password
  });
  if (updateError) {
    return { ok: false, error: 'Não foi possível atualizar a senha.' };
  }

  await supabase
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', user.id);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: UserRole }>();

  redirect(profile ? homeRouteForRole(profile.role) : '/login');
}
