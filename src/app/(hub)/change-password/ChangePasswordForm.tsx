'use client';

import { useFormState, useFormStatus } from 'react-dom';
import {
  changePasswordAction,
  type ChangeState
} from '@/features/auth/actions/change-password';
import { Field, Input, Submit } from '@/components/ui/Field';

const initial: ChangeState = { ok: false };

export function ChangePasswordForm() {
  const [state, formAction] = useFormState(changePasswordAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label="Senha atual" htmlFor="currentPassword">
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </Field>

      <Field
        label="Nova senha"
        htmlFor="password"
        hint="Mín 10 caracteres · maiúsculas + minúsculas + números + símbolos"
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="••••••••••"
        />
      </Field>

      <Field label="Confirmar nova senha" htmlFor="confirmPassword">
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          placeholder="••••••••••"
        />
      </Field>

      {state?.error && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {state.error}
        </p>
      )}

      <SubmitBtn />
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <Submit pending={pending}>Salvar nova senha</Submit>;
}
