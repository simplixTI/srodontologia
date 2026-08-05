import 'server-only';
import { loadIntegration, readIntegrationSecret } from '../config';

export type EmailSendRequest = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  data?: Record<string, unknown>;
};

export type EmailSendResult = { id?: string | null; provider: string };

/**
 * Provider-agnostic email send. Resolves the org's configured email
 * integration (Resend, SendGrid, SMTP mock). Falls back to console-log
 * (no-op) when nothing is configured.
 */
export async function sendEmailViaProvider(
  organizationId: string,
  req: EmailSendRequest
): Promise<EmailSendResult> {
  const integration = await loadIntegration(organizationId, 'email');
  if (!integration || !integration.enabled) {
    // eslint-disable-next-line no-console
    console.log('[email:mock]', { to: req.to, subject: req.subject });
    return { id: null, provider: 'mock' };
  }

  const secret = readIntegrationSecret(integration);

  switch (integration.provider) {
    case 'resend':
      return sendViaResend(secret, req, integration.config);
    case 'sendgrid':
      return sendViaSendgrid(secret, req);
    default:
      // eslint-disable-next-line no-console
      console.log('[email:unknown provider]', integration.provider);
      return { id: null, provider: integration.provider };
  }
}

async function sendViaResend(
  apiKey: string | null,
  req: EmailSendRequest,
  config: Record<string, unknown>
): Promise<EmailSendResult> {
  if (!apiKey) throw new Error('Resend integration missing secret');
  const from = (config?.from as string) ?? 'SR Digital <noreply@srdigital.com.br>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: req.to,
      subject: req.subject,
      html: req.html,
      text: req.text
    })
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
  const data = (await res.json()) as { id?: string };
  return { id: data.id ?? null, provider: 'resend' };
}

async function sendViaSendgrid(
  apiKey: string | null,
  req: EmailSendRequest
): Promise<EmailSendResult> {
  if (!apiKey) throw new Error('SendGrid integration missing secret');
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: (Array.isArray(req.to) ? req.to : [req.to]).map((email) => ({ email })) }],
      from: { email: 'noreply@srdigital.com.br', name: 'SR Digital' },
      subject: req.subject,
      content: [
        req.text ? { type: 'text/plain', value: req.text } : null,
        req.html ? { type: 'text/html', value: req.html } : null
      ].filter(Boolean)
    })
  });
  if (!res.ok) throw new Error(`SendGrid ${res.status}`);
  return { id: null, provider: 'sendgrid' };
}
