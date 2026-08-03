import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal do Dentista · SR Digital'
};

export default function PortalHomePage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-14 md:px-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Portal do Dentista
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>
        <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
          Em <span className="gold-text italic">construção.</span>
        </h1>
        <p className="max-w-xl text-white/60">
          O portal completo — enviar novo caso, acompanhar produção, aprovar
          orçamentos e planejamentos — chega na Fase 4 do SR HUB.
        </p>
      </header>

      <div className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-8">
        <ul className="grid gap-3 text-sm text-white/70 md:grid-cols-2">
          {[
            'Início · resumo do dia',
            'Novo caso · fluxo em etapas',
            'Meus casos · acompanhamento',
            'Orçamentos · aprovar ou solicitar ajuste',
            'Planejamentos · aprovação técnica',
            'Financeiro · faturas e comprovantes',
            'Entregas · rastreio',
            'Suporte · WhatsApp integrado'
          ].map((f) => (
            <li key={f} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-300" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
