'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { completeOnboardingStepAction, type OnboardingStep } from '@/features/onboarding/actions';

export function OnboardingStepButton({ step, label }: { step: OnboardingStep; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const submit = () => {
    start(async () => {
      const res = await completeOnboardingStepAction(step);
      if (!res.ok) {
        toast.error(res.error ?? 'Falha ao concluir etapa.');
        return;
      }
      toast.success('Etapa concluída.');
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={submit}
      disabled={pending}
      className="rounded-full border border-white/15 px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.28em] text-white/70 hover:border-white/30 hover:text-white disabled:opacity-50"
    >
      {pending ? '…' : label}
    </button>
  );
}
