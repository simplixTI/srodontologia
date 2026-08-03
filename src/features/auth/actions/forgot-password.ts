'use server';

import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { forgotPasswordSchema } from '@/lib/validations/auth';

export type ForgotState = {
  ok: boolean;
  message?: string;
};

export async function forgotPasswordAction(
  _prev: ForgotState | undefined,
  formData: FormData
): Promise<ForgotState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get('email')
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'E-mail inválido.' };
  }

  const supabase = createSupabaseServerClient();

  const hdrs = headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    hdrs.get('origin') ??
    `https://${hdrs.get('host')}`;

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/reset-password`
  });

  // Deliberately generic response — do not leak whether the email exists.
  return {
    ok: true,
    message:
      'Se este e-mail estiver cadastrado, enviaremos um link para redefinição em instantes.'
  };
}
