import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Segurança · SR Digital' };

export default function SegurancaPublicaPage() {
  return (
    <div className="min-h-[100svh] bg-black text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
        <header>
          <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Segurança</div>
          <h1 className="mt-1 font-display text-4xl text-white">Nosso compromisso com segurança</h1>
        </header>
        <div className="prose prose-invert prose-sm max-w-none space-y-4 text-white/80">
          <p>Boas práticas em vigor. Detalhes técnicos sensíveis não são publicados para não facilitar ataques.</p>
          <h2>Isolamento</h2>
          <p>Cada laboratório opera em ambiente logicamente isolado. Acesso a dados de outro laboratório é bloqueado no nível do banco.</p>
          <h2>Criptografia</h2>
          <p>Comunicação sempre em HTTPS. Segredos armazenados com hash sha256 (tokens de API, códigos de recuperação, CPF em cache).</p>
          <h2>Autenticação</h2>
          <p>2FA disponível via aplicativos autenticadores (TOTP). Códigos de recuperação hasheados. Sessões podem ser revogadas.</p>
          <h2>Cobrança</h2>
          <p>Dados de cartão nunca tocam nossos servidores — processados diretamente pelo Stripe.</p>
          <h2>Auditoria</h2>
          <p>Todas as ações críticas (login, mudança de plano, impersonação de suporte, acesso administrativo) são registradas.</p>
          <h2>Reportar vulnerabilidade</h2>
          <p>Se você encontrou algo suspeito, envie um e-mail para <code>seguranca@srdigital.com.br</code> com detalhes técnicos. Respondemos em até 48h úteis.</p>
        </div>
      </div>
    </div>
  );
}
