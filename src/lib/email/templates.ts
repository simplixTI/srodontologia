import 'server-only';
import type { TenantBranding } from '@/lib/branding/resolver';
import { DEFAULT_BRANDING } from '@/lib/branding/resolver';

export type EmailTemplateKey =
  | 'welcome'
  | 'email_verification'
  | 'team_invite'
  | 'trial_started'
  | 'trial_ending_soon'
  | 'trial_ended'
  | 'subscription_activated'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'subscription_cancelled'
  | 'account_suspended'
  | 'quote_available'
  | 'planning_available'
  | 'case_ready'
  | 'new_message'
  | 'lgpd_export_ready'
  | 'lgpd_deletion_requested'
  | 'ticket_updated'
  | 'security_alert'
  | 'totp_enabled'
  | 'password_reset';

export type RenderedEmail = { subject: string; html: string; text: string };

export type EmailData = {
  branding?: Partial<TenantBranding>;
  recipient_name?: string;
  app_url?: string;
  data?: Record<string, unknown>;
};

/**
 * Renders a transactional email template into HTML + plain text.
 * All content is HTML-escaped. Templates never include clinical content
 * in subject line (LGPD-friendly previews).
 */
export function renderEmail(template: EmailTemplateKey, ctx: EmailData): RenderedEmail {
  const brand = { ...DEFAULT_BRANDING, ...(ctx.branding ?? {}) };
  const name = ctx.recipient_name ?? 'Olá';
  const app = ctx.app_url ?? (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');
  const data = ctx.data ?? {};

  switch (template) {
    case 'welcome':
      return build(brand, {
        subject: `Bem-vindo à ${brand.brand_name}`,
        heading: `Olá, ${name.split(' ')[0]}.`,
        body: `Sua conta foi criada. Você tem 14 dias de trial para explorar tudo.`,
        cta: { label: 'Entrar no HUB', href: `${app}/login` }
      });
    case 'email_verification':
      return build(brand, {
        subject: `Confirme seu e-mail`,
        heading: `Confirme seu e-mail`,
        body: `Clique no botão abaixo para confirmar o e-mail associado à sua conta.`,
        cta: { label: 'Confirmar', href: str(data.verify_url) ?? app }
      });
    case 'team_invite':
      return build(brand, {
        subject: `Convite para ${str(data.org_name) ?? brand.brand_name}`,
        heading: `Você foi convidado`,
        body: `${str(data.inviter_name) ?? 'A equipe'} convidou você para ${str(data.org_name) ?? brand.brand_name} com o papel ${str(data.role) ?? 'membro'}.`,
        cta: { label: 'Aceitar convite', href: `${app}/accept-invite?token=${str(data.token) ?? ''}` }
      });
    case 'trial_started':
      return build(brand, {
        subject: `Seu trial começou`,
        heading: `Bom te ter aqui, ${name.split(' ')[0]}`,
        body: `Você tem ${str(data.days) ?? '14'} dias para explorar tudo — sem cartão.`,
        cta: { label: 'Começar', href: `${app}/onboarding` }
      });
    case 'trial_ending_soon':
      return build(brand, {
        subject: `Seu trial termina em breve`,
        heading: `Seu trial termina em ${str(data.days_left) ?? '3'} dias`,
        body: `Escolha um plano para não perder acesso.`,
        cta: { label: 'Escolher plano', href: `${app}/billing` }
      });
    case 'trial_ended':
      return build(brand, {
        subject: `Seu trial encerrou`,
        heading: `Trial encerrado`,
        body: `Reative sua conta escolhendo um plano.`,
        cta: { label: 'Ver planos', href: `${app}/billing` }
      });
    case 'subscription_activated':
      return build(brand, {
        subject: `Assinatura ativada`,
        heading: `Tudo pronto, ${name.split(' ')[0]}`,
        body: `Sua assinatura do plano ${str(data.plan_name) ?? '—'} foi ativada.`,
        cta: { label: 'Abrir HUB', href: `${app}/dashboard` }
      });
    case 'payment_succeeded':
      return build(brand, {
        subject: `Pagamento aprovado`,
        heading: `Pagamento aprovado`,
        body: `Fatura ${str(data.invoice_number) ?? ''} paga com sucesso.`,
        cta: { label: 'Ver fatura', href: str(data.invoice_url) ?? `${app}/billing` }
      });
    case 'payment_failed':
      return build(brand, {
        subject: `Falha na cobrança`,
        heading: `Não conseguimos processar seu pagamento`,
        body: `Atualize seu método de pagamento para evitar suspensão.`,
        cta: { label: 'Atualizar pagamento', href: `${app}/billing` }
      });
    case 'subscription_cancelled':
      return build(brand, {
        subject: `Assinatura cancelada`,
        heading: `Sua assinatura foi cancelada`,
        body: `Você mantém acesso até ${str(data.access_until) ?? 'o fim do período'}.`,
        cta: { label: 'Reativar', href: `${app}/billing` }
      });
    case 'account_suspended':
      return build(brand, {
        subject: `Conta suspensa`,
        heading: `Sua conta foi suspensa`,
        body: `Regularize o pagamento para reativar.`,
        cta: { label: 'Regularizar', href: `${app}/billing` }
      });
    case 'quote_available':
      return build(brand, {
        subject: `Orçamento disponível`,
        heading: `Orçamento disponível para revisão`,
        body: `Um novo orçamento está aguardando sua aprovação.`,
        cta: { label: 'Ver caso', href: `${app}/portal/casos/${str(data.case_id) ?? ''}?tab=quotes` }
      });
    case 'planning_available':
      return build(brand, {
        subject: `Planejamento técnico disponível`,
        heading: `Planejamento disponível`,
        body: `O planejamento técnico do seu caso está pronto para revisão.`,
        cta: { label: 'Ver caso', href: `${app}/portal/casos/${str(data.case_id) ?? ''}?tab=planning` }
      });
    case 'case_ready':
      return build(brand, {
        subject: `Seu caso está pronto`,
        heading: `Caso pronto`,
        body: `Seu caso foi concluído. Confira os próximos passos no portal.`,
        cta: { label: 'Ver caso', href: `${app}/portal/casos/${str(data.case_id) ?? ''}` }
      });
    case 'new_message':
      return build(brand, {
        subject: `Nova mensagem no seu caso`,
        heading: `Você tem uma nova mensagem`,
        body: `Abra o portal para ler e responder.`,
        cta: { label: 'Ver conversa', href: `${app}/portal/casos/${str(data.case_id) ?? ''}?tab=chat` }
      });
    case 'lgpd_export_ready':
      return build(brand, {
        subject: `Exportação de dados pronta`,
        heading: `Sua exportação está pronta`,
        body: `O pacote fica disponível por 7 dias.`,
        cta: { label: 'Baixar', href: str(data.download_url) ?? `${app}/lgpd` }
      });
    case 'lgpd_deletion_requested':
      return build(brand, {
        subject: `Solicitação de exclusão registrada`,
        heading: `Solicitação de exclusão registrada`,
        body: `A execução acontecerá em ${str(data.scheduled_at) ?? '30 dias'}. Você pode cancelar dentro desse período.`,
        cta: { label: 'Ver detalhes', href: `${app}/lgpd` }
      });
    case 'ticket_updated':
      return build(brand, {
        subject: `Atualização no seu ticket`,
        heading: `Ticket atualizado`,
        body: `Confira a resposta da equipe de suporte.`,
        cta: { label: 'Ver ticket', href: `${app}/suporte` }
      });
    case 'security_alert':
      return build(brand, {
        subject: `Alerta de segurança`,
        heading: `Nova atividade detectada`,
        body: `${str(data.event) ?? 'Novo acesso'} — se não foi você, revogue imediatamente.`,
        cta: { label: 'Ver sessões', href: `${app}/perfil/sessoes` }
      });
    case 'totp_enabled':
      return build(brand, {
        subject: `Verificação em dois fatores ativada`,
        heading: `2FA ativado`,
        body: `Sua conta está mais segura. Guarde os códigos de recuperação em local seguro.`,
        cta: { label: 'Gerenciar segurança', href: `${app}/perfil/seguranca` }
      });
    case 'password_reset':
      return build(brand, {
        subject: `Redefinição de senha`,
        heading: `Redefina sua senha`,
        body: `Clique no botão para escolher uma nova senha. O link expira em 1 hora.`,
        cta: { label: 'Redefinir', href: str(data.reset_url) ?? `${app}/reset-password` }
      });
  }
}

function build(brand: TenantBranding, args: {
  subject: string;
  heading: string;
  body: string;
  cta?: { label: string; href: string };
}): RenderedEmail {
  const { subject, heading, body, cta } = args;
  const primary = brand.primary_color;
  const accent = brand.accent_color;
  const brandName = htmlEscape(brand.brand_name);

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f6f5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f5f2;padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:${primary};border:1px solid rgba(0,0,0,0.05);border-radius:16px;overflow:hidden;">
      <tr><td style="padding:32px 32px 16px;text-align:center;background:radial-gradient(circle at 50% 0%, rgba(255,255,255,0.06), transparent 70%);">
        ${brand.logo_url ? `<img src="${htmlEscape(brand.logo_url)}" alt="${brandName}" width="120" style="max-width:120px;height:auto;margin:0 auto 12px;display:block;" />` : ''}
        <div style="font-family:Georgia,serif;font-size:22px;letter-spacing:0.18em;color:${accent};">${brandName}</div>
      </td></tr>
      <tr><td style="padding:24px 32px;">
        <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-weight:400;font-size:26px;line-height:1.2;color:#ffffff;">${htmlEscape(heading)}</h1>
        <p style="margin:0;font-size:15px;line-height:1.55;color:rgba(255,255,255,0.75);">${htmlEscape(body)}</p>
        ${cta ? `<p style="margin:28px 0 0;"><a href="${htmlEscape(cta.href)}" style="display:inline-block;padding:12px 24px;background:${accent};color:${primary};text-decoration:none;border-radius:999px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;font-weight:600;">${htmlEscape(cta.label)}</a></p>` : ''}
      </td></tr>
      <tr><td style="padding:24px 32px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:0.16em;text-transform:uppercase;">${brandName}</p>
        <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,0.3);">Este é um e-mail transacional. Se recebeu por engano, ignore.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const text = [
    `${brand.brand_name}`,
    '',
    heading,
    '',
    body,
    ...(cta ? ['', `${cta.label}: ${cta.href}`] : [])
  ].join('\n');

  return { subject, html, text };
}

function htmlEscape(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
