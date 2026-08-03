import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Entrar · SR HUB',
  robots: { index: false, follow: false }
};

export default function LoginPage({
  searchParams
}: {
  searchParams?: { reason?: string };
}) {
  const reason = searchParams?.reason;
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            SR HUB
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>
        <h1 className="font-display text-4xl leading-tight text-white">
          Bem-vindo <span className="gold-text italic">de volta.</span>
        </h1>
        <p className="text-sm text-white/60">
          Acesse o painel interno da SR Digital.
        </p>
      </header>

      {reason === 'inactive' && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          Sua conta está inativa. Contate um administrador.
        </p>
      )}

      <LoginForm />

      <div className="flex items-center justify-between text-xs">
        <Link
          href="/forgot-password"
          className="text-white/60 transition hover:text-gold-100"
        >
          Esqueci minha senha
        </Link>
        <Link href="/" className="text-white/40 transition hover:text-white/70">
          ← Voltar ao site
        </Link>
      </div>
    </div>
  );
}
