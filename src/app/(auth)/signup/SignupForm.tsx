'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { signupTenantAction, type SignupState } from '@/features/signup/actions';
import { TurnstileWidget } from '@/components/captcha/TurnstileWidget';

const initial: SignupState = { ok: false };

export function SignupForm() {
  const [state, formAction] = useFormState(signupTenantAction, initial);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-3">
        <Field label="Laboratório">
          <input
            name="company_name"
            required
            minLength={2}
            maxLength={120}
            placeholder="Ex.: Prótese Digital"
            className="h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none"
          />
        </Field>
        <Field label="Slug (usado em URL: sub.srdigital.com.br)">
          <input
            name="slug"
            required
            minLength={3}
            maxLength={40}
            pattern="[a-z0-9-]+"
            placeholder="protese-digital"
            className="h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none"
          />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Razão social (opcional)">
            <input
              name="legal_name"
              maxLength={200}
              className="h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
            />
          </Field>
          <Field label="CNPJ (opcional)">
            <input
              name="document"
              maxLength={30}
              className="h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
            />
          </Field>
        </div>

        <div className="border-t border-white/10 pt-3">
          <div className="text-[0.55rem] uppercase tracking-[0.28em] text-gold-100">Seu acesso</div>
          <div className="mt-3 grid gap-3">
            <Field label="Seu nome">
              <input
                name="full_name"
                required
                minLength={2}
                maxLength={120}
                className="h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
              />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="E-mail">
                <input
                  name="email"
                  type="email"
                  required
                  className="h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
                />
              </Field>
              <Field label="Telefone (opcional)">
                <input
                  name="phone"
                  maxLength={30}
                  className="h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
                />
              </Field>
            </div>
            <Field label="Senha (mínimo 8 caracteres)">
              <input
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={72}
                className="h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
              />
            </Field>
          </div>
        </div>
      </div>

      {state.error && (
        <p className="rounded-xl border border-red-400/30 bg-red-400/5 p-3 text-xs text-red-200">
          {state.error}
        </p>
      )}

      <div className="flex justify-center">
        <TurnstileWidget />
      </div>

      <Submit />

      <p className="text-center text-[0.6rem] text-white/40">
        Ao criar sua conta você concorda com nossos Termos e Política de Privacidade (LGPD).
      </p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">{label}</span>
      {children}
    </label>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-gold/40 bg-gold/10 py-3 text-[0.65rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 hover:bg-gold/20 disabled:opacity-50"
    >
      {pending ? 'Criando sua conta…' : 'Começar meu trial gratuito'}
    </button>
  );
}
