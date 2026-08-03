import Link from 'next/link';
import { Shield, CheckCircle2 } from 'lucide-react';
import { LogoLockup } from '@/components/ui/Logo';

const steps = [
  'Configurar SUPABASE_URL e SUPABASE_ANON_KEY no host',
  'Aplicar migrations (supabase db push)',
  'Rodar o script de bootstrap da Aline (npm run hub:create-admin)',
  'Redeploy — pronto, /admin abrirá o login do SR HUB'
];

export function NotConfiguredScreen() {
  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(700px_500px_at_50%_-20%,rgba(201,162,75,0.14),transparent_70%)]" />
      </div>

      <div className="mx-auto flex min-h-[100svh] max-w-xl flex-col items-center justify-center px-6 py-14 text-center">
        <LogoLockup width={140} />

        <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/[0.06] px-4 py-1.5 backdrop-blur">
          <Shield className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
          <span className="text-[0.6rem] uppercase tracking-[0.35em] text-gold-100">
            SR HUB
          </span>
        </div>

        <h1 className="mt-8 font-display text-5xl leading-[1.05] text-white md:text-6xl">
          Em <span className="gold-text italic">preparação.</span>
        </h1>

        <p className="mt-6 max-w-md text-white/60">
          O painel administrativo do SR Digital está pronto no código,
          aguardando a conclusão da configuração do backend (Supabase).
        </p>

        <ul className="mt-10 w-full max-w-md space-y-3 text-left">
          {steps.map((s, i) => (
            <li
              key={s}
              className="flex items-start gap-3 rounded-xl border border-gold/10 bg-white/[0.02] p-4"
            >
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-gold-300"
                strokeWidth={1.4}
              />
              <span className="text-sm text-white/75">
                <span className="mr-2 text-white/40">0{i + 1}.</span>
                {s}
              </span>
            </li>
          ))}
        </ul>

        <Link
          href="/"
          className="mt-12 text-[0.65rem] uppercase tracking-[0.32em] text-white/60 transition hover:text-gold-100"
        >
          ← Voltar ao site
        </Link>
      </div>
    </main>
  );
}
