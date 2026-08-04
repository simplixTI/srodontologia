'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resetPasswordSchema } from '@/lib/validations/auth';
import { homeRouteForRole } from '@/lib/permissions/roles';
import type { UserRole } from '@/types/database';

export type ResetState = {
  ok: boolean;
  error?: string;
};

export async function resetPasswordAction(
  _prev: ResetState | undefined,
  formData: FormData
): Promise<ResetState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword')
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const supabase = createSupabaseServerClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      error: 'Sessão de recuperação inválida ou expirada. Solicite um novo link.'
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { ok: false, error: 'Não foi possível atualizar a senha. Tente novamente.' };
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
