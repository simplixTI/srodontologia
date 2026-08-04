import Link from 'next/link';
import type { Metadata } from 'next';
import { LogoLockup } from '@/components/ui/Logo';

export const metadata: Metadata = {
  title: 'Página não encontrada · SR Digital',
  robots: { index: false, follow: false }
};

export default function NotFoundPage() {
  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute inset-0 bg-[radial-gradient(700px_500px_at_50%_-20%,rgba(201,162,75,0.14),transparent_70%)]" />
      </div>

      <div className="mx-auto flex min-h-[100svh] max-w-2xl flex-col items-center justify-center px-6 py-14 text-center">
        <LogoLockup width={140} priority />

        <div className="mt-14 flex items-baseline gap-3">
          <span className="font-display text-[9rem] leading-none text-white/10 md:text-[12rem]">
            4
          </span>
          <span className="font-display text-[9rem] leading-none text-gold-300/50 md:text-[12rem]">
            0
          </span>
          <span className="font-display text-[9rem] leading-none text-white/10 md:text-[12rem]">
            4
          </span>
        </div>

        <h1 className="mt-6 font-display text-3xl leading-tight text-white md:text-4xl">
          Página <span className="gold-text italic">não encontrada.</span>
        </h1>
        <p className="mt-4 max-w-md text-white/60">
          O endereço acessado não existe ou foi movido. Verifique a URL ou
          volte à página principal.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="btn-gold inline-flex h-11 items-center justify-center rounded-full px-6 text-[0.7rem] uppercase tracking-[0.24em]"
          >
            Voltar ao site
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-full border border-gold/25 px-6 text-[0.65rem] uppercase tracking-[0.28em] text-gold-100 transition hover:bg-gold/5"
          >
            Ir para o SR HUB
          </Link>
        </div>
      </div>
    </main>
  );
}
