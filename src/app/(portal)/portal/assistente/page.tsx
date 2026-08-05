import type { Metadata } from 'next';
import { DentistAssistantChat } from './DentistAssistantChat';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Assistente · Portal SR Digital' };

export default function PortalAssistentePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Assistente</div>
        <h1 className="mt-1 font-display text-2xl text-white md:text-3xl">Como podemos ajudar?</h1>
        <p className="mt-2 text-sm text-white/60">
          Tire dúvidas sobre uso do portal, envio de arquivos e aprovações. Para o status de um caso
          específico, abra a página do caso.
        </p>
      </header>
      <DentistAssistantChat />
    </div>
  );
}
