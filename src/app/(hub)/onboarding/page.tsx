import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { getOnboardingProgress } from '@/features/onboarding/queries';
import { STEP_ORDER, type OnboardingStep } from '@/features/onboarding/actions';
import { OnboardingStepButton } from './OnboardingStepButton';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Onboarding · SR HUB' };

const STEP_LABELS: Record<OnboardingStep, { title: string; description: string; cta: string; href: string }> = {
  company:      { title: 'Empresa',        description: 'Confirme os dados do laboratório.', cta: 'Concluir', href: '/onboarding' },
  branding:     { title: 'Identidade',     description: 'Envie logo e defina cores.',        cta: 'Personalizar', href: '/branding' },
  team:         { title: 'Equipe',         description: 'Convide sua equipe interna.',       cta: 'Convidar', href: '/equipe' },
  clinic:       { title: 'Primeira clínica', description: 'Cadastre uma clínica parceira.', cta: 'Cadastrar', href: '/clinicas/novo' },
  first_case:   { title: 'Primeiro caso',  description: 'Envie ou crie um caso de exemplo.', cta: 'Começar',  href: '/casos/novo' },
  integrations: { title: 'Integrações',    description: 'WhatsApp, Email, IA (opcional).',    cta: 'Configurar', href: '/integracoes' },
  done:         { title: 'Pronto!',        description: 'Onboarding concluído.',              cta: 'Ir ao dashboard', href: '/dashboard' }
};

export default async function OnboardingPage() {
  const progress = await getOnboardingProgress();
  const completed = new Set(progress.completed_steps);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Bem-vindo</div>
        <h1 className="mt-1 font-display text-3xl text-white md:text-4xl">Vamos configurar sua conta</h1>
        <p className="mt-2 text-sm text-white/60">
          Etapa {STEP_ORDER.indexOf(progress.current_step) + 1} de {STEP_ORDER.length - 1}.
        </p>
      </header>

      <ol className="flex flex-col gap-3">
        {STEP_ORDER.filter((s) => s !== 'done').map((step) => {
          const done = completed.has(step);
          const active = progress.current_step === step;
          const info = STEP_LABELS[step];
          return (
            <li
              key={step}
              className={
                active
                  ? 'rounded-2xl border border-gold/40 bg-gold/[0.04] p-4'
                  : done
                  ? 'rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.03] p-4'
                  : 'rounded-2xl border border-white/10 bg-white/[0.02] p-4'
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {done ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" strokeWidth={1.5} />
                  ) : (
                    <Circle className={active ? 'mt-0.5 h-5 w-5 text-gold-100' : 'mt-0.5 h-5 w-5 text-white/40'} strokeWidth={1.5} />
                  )}
                  <div>
                    <div className={active ? 'text-sm text-white' : 'text-sm text-white/80'}>{info.title}</div>
                    <div className="mt-1 text-xs text-white/50">{info.description}</div>
                  </div>
                </div>
                {!done && (
                  <div className="flex items-center gap-2">
                    {info.href !== '/onboarding' && (
                      <Link
                        href={info.href}
                        className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70"
                      >
                        {info.cta}
                      </Link>
                    )}
                    <OnboardingStepButton step={step} label={info.href === '/onboarding' ? 'Concluir' : 'Marcar concluído'} />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
