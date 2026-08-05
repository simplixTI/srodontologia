import type { Metadata } from 'next';
import { LabAssistantChat } from './LabAssistantChat';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Assistente IA · SR HUB' };

export default function AssistentePage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Inteligência</div>
        <h1 className="mt-1 font-display text-2xl text-white md:text-3xl">Assistente do laboratório</h1>
        <p className="mt-2 text-sm text-white/60">
          Pergunte sobre casos, atrasos, faturamento, produtividade — o assistente responde usando os dados
          reais da sua organização. Nenhum caso é enviado ao provedor sem contexto controlado.
        </p>
      </header>
      <LabAssistantChat />
    </div>
  );
}
