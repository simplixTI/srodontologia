'use client';

import { useFormState, useFormStatus } from 'react-dom';
import {
  resetPasswordAction,
  type ResetState
} from '@/features/auth/actions/reset-password';
import { Field, Input, Submit } from '@/components/ui/Field';

const initial: ResetState = { ok: false };

export function ResetForm() {
  const [state, formAction] = useFormState(resetPasswordAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-5">
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

      <Field label="Confirmar senha" htmlFor="confirmPassword">
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
