import type { Metadata } from 'next';
import { listAutomationRules } from '@/features/automations/queries';
import { AutomationList } from './AutomationList';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Automações · SR HUB' };

export default async function AutomacoesPage() {
  const rules = await listAutomationRules();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Inteligência</div>
        <h1 className="mt-1 font-display text-2xl text-white md:text-3xl">Central de automações</h1>
        <p className="mt-2 text-sm text-white/60">
          Regras baseadas em eventos. Quando um evento é publicado (ex.: orçamento aprovado), a regra
          dispara ações — notificar, mudar status, enviar e-mail/WhatsApp, chamar webhook.
        </p>
      </header>
      <AutomationList initial={rules} />
    </div>
  );
}
