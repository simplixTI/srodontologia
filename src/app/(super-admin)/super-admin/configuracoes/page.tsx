import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Configurações · SR Platform' };

export default function ConfigPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <h1 className="font-display text-3xl text-white md:text-4xl">Configurações globais</h1>
        <p className="mt-2 text-sm text-white/60">
          Providers e integrações são configurados por tenant em <code className="rounded bg-black/40 px-1">/integracoes</code>.
          Secrets são lidos apenas de variáveis de ambiente do servidor.
        </p>
      </header>

      <section className="rounded-2xl border border-gold/15 bg-white/[0.02] p-5">
        <h2 className="text-sm text-white">Variáveis esperadas</h2>
        <ul className="mt-3 space-y-1 font-mono text-xs text-white/70">
          <li>NEXT_PUBLIC_SUPABASE_URL</li>
          <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
          <li>SUPABASE_SERVICE_ROLE_KEY</li>
          <li>CRON_SECRET</li>
          <li>OPENAI_API_KEY (opcional)</li>
          <li>ANTHROPIC_API_KEY (opcional)</li>
          <li>GOOGLE_AI_API_KEY (opcional)</li>
          <li>OPENROUTER_API_KEY (opcional)</li>
          <li>EMAIL_API_KEY (opcional)</li>
          <li>WHATSAPP_TOKEN (opcional)</li>
          <li>STRIPE_SECRET_KEY (opcional)</li>
          <li>MP_ACCESS_TOKEN (opcional)</li>
        </ul>
      </section>
    </div>
  );
}
