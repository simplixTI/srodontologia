import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetForm } from './ResetForm';

export const metadata: Metadata = {
  title: 'Redefinir senha · SR HUB',
  robots: { index: false, follow: false }
};

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            SR HUB
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>
        <h1 className="font-display text-3xl leading-tight text-white">
          Definir nova <span className="gold-text italic">senha.</span>
        </h1>
        <p className="text-sm text-white/60">
          Escolha uma senha forte. Mínimo 10 caracteres, com maiúsculas,
          minúsculas, números e símbolos.
        </p>
      </header>

      <ResetForm />

      <div className="text-center text-xs">
        <Link href="/login" className="text-white/60 transition hover:text-gold-100">
          ← Voltar para o login
        </Link>
      </div>
    </div>
  );
}
