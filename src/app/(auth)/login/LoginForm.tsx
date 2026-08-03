'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { loginAction, type LoginState } from '@/features/auth/actions/login';
import { Field, Input, Submit } from '@/components/ui/Field';

const initialState: LoginState = { ok: false };

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, initialState);
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

      <Field label="Senha" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
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
  return <Submit pending={pending}>Entrar</Submit>;
}
