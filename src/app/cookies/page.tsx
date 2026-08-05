import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Cookies · SR Digital' };

export default function CookiesPage() {
  return (
    <div className="min-h-[100svh] bg-black text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
        <header>
          <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Documento legal</div>
          <h1 className="mt-1 font-display text-4xl text-white">Política de Cookies</h1>
        </header>
        <div className="prose prose-invert prose-sm max-w-none space-y-4 text-white/80">
          <h2>O que usamos</h2>
          <ul>
            <li><strong>Sessão (necessário):</strong> cookies HttpOnly do Supabase Auth para manter você logado.</li>
            <li><strong>CSRF (necessário):</strong> proteção contra falsificação de requisições em formulários.</li>
            <li><strong>Preferências (funcional):</strong> escolhas de UI e branding do tenant.</li>
            <li><strong>Impersonação (administrativo):</strong> cookie temporário usado apenas por administradores da plataforma para suporte auditado.</li>
          </ul>
          <p>Não usamos cookies de publicidade nem trackers de terceiros no produto.</p>
          <h2>Retenção</h2>
          <p>Sessão: até logout ou expiração natural do refresh token. Preferências: até você limpar.</p>
        </div>
      </div>
    </div>
  );
}
