import type { Metadata } from 'next';
import Link from 'next/link';
import { SignupForm } from './SignupForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Criar conta · SR Digital' };

export default function SignupPage() {
  return (
    <div className="min-h-[100svh] bg-black text-white">
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-10">
        <div className="text-center">
          <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">SR Digital</div>
          <h1 className="mt-1 font-display text-3xl text-white">Crie sua conta</h1>
          <p className="mt-2 text-sm text-white/60">
            14 dias grátis. Sem cartão. Cancele quando quiser.
          </p>
        </div>
        <SignupForm />
        <p className="text-center text-xs text-white/50">
          Já tem conta?{' '}
          <Link href="/login" className="text-gold-100 hover:text-gold-50">
            Entre
          </Link>
        </p>
      </div>
    </div>
  );
}
