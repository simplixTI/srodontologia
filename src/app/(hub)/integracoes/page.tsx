import type { Metadata } from 'next';
import { getAiSettings, listIntegrations } from '@/features/integrations/queries';
import { IntegrationsPanel } from './IntegrationsPanel';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Integrações · SR HUB' };

export default async function IntegracoesPage() {
  const [ai, integrations] = await Promise.all([getAiSettings(), listIntegrations()]);
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Sistema</div>
        <h1 className="mt-1 font-display text-2xl text-white md:text-3xl">Integrações</h1>
        <p className="mt-2 text-sm text-white/60">
          Configure providers de IA, OCR, CPF, WhatsApp, e-mail e webhooks. Todas as chaves são lidas de
          variáveis de ambiente — nunca ficam salvas no banco.
        </p>
      </header>
      <IntegrationsPanel ai={ai} integrations={integrations} />
    </div>
  );
}
