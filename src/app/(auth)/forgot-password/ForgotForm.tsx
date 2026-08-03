'use client';

import { useFormState, useFormStatus } from 'react-dom';
import {
  forgotPasswordAction,
  type ForgotState
} from '@/features/auth/actions/forgot-password';
import { Field, Input, Submit } from '@/components/ui/Field';

const initial: ForgotState = { ok: false };

export function ForgotForm() {
  const [state, formAction] = useFormState(forgotPasswordAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label="E-mail" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="voce@empresa.com.br"
        />
      </Field>

      {state?.message && (
        <p
          className={
            state.ok
              ? 'rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200'
              : 'rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200'
          }
        >
          {state.message}
        </p>
      )}

      <SubmitBtn />
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <Submit pending={pending}>Enviar link</Submit>;
}
