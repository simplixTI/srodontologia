import type { Metadata } from 'next';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;
export const metadata: Metadata = { title: 'Termos de Uso · SR Digital' };

export default async function TermosPage() {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('legal_documents')
    .select('title, version, effective_at, published_at, content_url')
    .eq('kind', 'terms')
    .eq('is_current', true)
    .maybeSingle<{ title: string; version: string; effective_at: string; published_at: string; content_url: string | null }>();

  return (
    <LegalShell
      title={data?.title ?? 'Termos de Uso'}
      version={data?.version ?? 'v1.0'}
      effectiveAt={data?.effective_at ?? new Date().toISOString()}
    >
      <p>
        Estes são os Termos de Uso da plataforma SR Digital. O conteúdo definitivo será publicado
        pela equipe jurídica antes do lançamento comercial oficial.
      </p>
      <p>
        Ao criar uma conta, você declara ter poderes para representar o laboratório e concorda com
        as regras de uso responsável descritas abaixo.
      </p>
      <h2>1. Elegibilidade</h2>
      <p>O serviço destina-se a laboratórios odontológicos e profissionais legalmente habilitados.</p>
      <h2>2. Conta e credenciais</h2>
      <p>Você é responsável por manter suas credenciais seguras e por ativar 2FA para papéis administrativos.</p>
      <h2>3. Pagamentos e assinatura</h2>
      <p>A cobrança segue o plano contratado. Inadimplência aplica bloqueios graduais conforme documentado no painel de faturamento.</p>
      <h2>4. Dados e privacidade</h2>
      <p>O tratamento de dados pessoais segue a Política de Privacidade e a LGPD. Solicitações de exportação e exclusão estão disponíveis em /lgpd.</p>
      <h2>5. Uso responsável</h2>
      <p>É proibido usar a plataforma para violar leis, direitos de terceiros ou realizar ataques automatizados.</p>
      <h2>6. Alterações</h2>
      <p>Podemos atualizar estes termos com aviso prévio de 30 dias.</p>
    </LegalShell>
  );
}

function LegalShell({ title, version, effectiveAt, children }: {
  title: string; version: string; effectiveAt: string; children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100svh] bg-black text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
        <header>
          <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Documento legal</div>
          <h1 className="mt-1 font-display text-4xl text-white">{title}</h1>
          <div className="mt-2 text-xs text-white/50">
            Versão {version} · vigente desde {new Date(effectiveAt).toLocaleDateString('pt-BR')}
          </div>
        </header>
        <div className="prose prose-invert prose-sm max-w-none space-y-4 text-white/80">
          {children}
        </div>
      </div>
    </div>
  );
}
