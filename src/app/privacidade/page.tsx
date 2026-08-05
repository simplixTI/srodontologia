import type { Metadata } from 'next';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;
export const metadata: Metadata = { title: 'Política de Privacidade · SR Digital' };

export default async function PrivacidadePage() {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('legal_documents')
    .select('title, version, effective_at')
    .eq('kind', 'privacy')
    .eq('is_current', true)
    .maybeSingle<{ title: string; version: string; effective_at: string }>();

  return (
    <div className="min-h-[100svh] bg-black text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
        <header>
          <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Documento legal</div>
          <h1 className="mt-1 font-display text-4xl text-white">{data?.title ?? 'Política de Privacidade'}</h1>
          <div className="mt-2 text-xs text-white/50">
            Versão {data?.version ?? 'v1.0'} · vigente desde{' '}
            {new Date(data?.effective_at ?? Date.now()).toLocaleDateString('pt-BR')}
          </div>
        </header>
        <div className="prose prose-invert prose-sm max-w-none space-y-4 text-white/80">
          <p>
            Esta é uma versão preliminar. O texto final será publicado pela equipe jurídica antes
            do lançamento comercial. As diretrizes abaixo refletem as práticas técnicas em vigor.
          </p>
          <h2>Dados coletados</h2>
          <ul>
            <li>Dados de conta: nome, e-mail, papel, organização.</li>
            <li>Dados operacionais: casos, mensagens, arquivos (sob controle do laboratório).</li>
            <li>Dados técnicos: IP hash, user-agent, sessões (para segurança).</li>
          </ul>
          <h2>Finalidade</h2>
          <p>Prestação do serviço, segurança da conta, cobrança e cumprimento de obrigações legais.</p>
          <h2>Base legal (LGPD)</h2>
          <p>Execução de contrato, obrigação legal, legítimo interesse e consentimento onde aplicável.</p>
          <h2>Direitos do titular</h2>
          <p>Confirmação, acesso, correção, portabilidade, exclusão e anonimização. Solicite em /lgpd.</p>
          <h2>Compartilhamento</h2>
          <p>
            Providers essenciais: Supabase (hospedagem), Stripe (pagamento), Vercel (hospedagem),
            provedor de e-mail transacional. Nenhum dado é vendido.
          </p>
          <h2>Retenção</h2>
          <p>Dados operacionais mantidos enquanto a assinatura estiver ativa + 90 dias após cancelamento. Auditoria + registros financeiros retidos por 5 anos.</p>
          <h2>Contato do DPO</h2>
          <p>dpo@srdigital.com.br</p>
        </div>
      </div>
    </div>
  );
}
