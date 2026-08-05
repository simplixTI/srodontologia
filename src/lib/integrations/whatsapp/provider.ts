import 'server-only';
import { loadIntegration, readIntegrationSecret } from '../config';

export type WhatsappSendRequest = {
  to: string;
  message?: string;
  template?: string;
  data?: Record<string, unknown>;
};

export type WhatsappSendResult = { id?: string | null; provider: string };

/**
 * Provider-agnostic WhatsApp send. Supports:
 *   - 'z-api'
 *   - 'twilio'
 *   - 'wa-cloud' (Meta Cloud API)
 * Falls back to log/no-op when not configured.
 */
export async function sendWhatsappViaProvider(
  organizationId: string,
  req: WhatsappSendRequest
): Promise<WhatsappSendResult> {
  const integration = await loadIntegration(organizationId, 'whatsapp');
  if (!integration || !integration.enabled) {
    // eslint-disable-next-line no-console
    console.log('[whatsapp:mock]', req);
    return { id: null, provider: 'mock' };
  }

  const secret = readIntegrationSecret(integration);

  switch (integration.provider) {
    case 'z-api':
      return sendViaZapi(secret, req, integration.config);
    case 'twilio':
      return sendViaTwilio(secret, req, integration.config);
    case 'wa-cloud':
      return sendViaMeta(secret, req, integration.config);
    default:
      return { id: null, provider: integration.provider };
  }
}

async function sendViaZapi(
  token: string | null,
  req: WhatsappSendRequest,
  cfg: Record<string, unknown>
): Promise<WhatsappSendResult> {
  if (!token) throw new Error('Z-API integration missing secret');
  const instance = cfg?.instance as string | undefined;
  if (!instance) throw new Error('Z-API instance missing in config');
  const res = await fetch(`https://api.z-api.io/instances/${instance}/token/${token}/send-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: req.to, message: req.message })
  });
  if (!res.ok) throw new Error(`Z-API ${res.status}`);
  const data = (await res.json()) as { id?: string };
  return { id: data.id ?? null, provider: 'z-api' };
}

async function sendViaTwilio(
  authToken: string | null,
  req: WhatsappSendRequest,
  cfg: Record<string, unknown>
): Promise<WhatsappSendResult> {
  if (!authToken) throw new Error('Twilio integration missing secret');
  const accountSid = cfg?.account_sid as string | undefined;
  const from = cfg?.from as string | undefined;
  if (!accountSid || !from) throw new Error('Twilio config missing account_sid/from');
  const body = new URLSearchParams({
    From: `whatsapp:${from}`,
    To: `whatsapp:${req.to}`,
    Body: req.message ?? ''
  });
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!res.ok) throw new Error(`Twilio ${res.status}`);
  return { id: null, provider: 'twilio' };
}

async function sendViaMeta(
  token: string | null,
  req: WhatsappSendRequest,
  cfg: Record<string, unknown>
): Promise<WhatsappSendResult> {
  if (!token) throw new Error('WhatsApp Cloud missing secret');
  const phoneId = cfg?.phone_number_id as string | undefined;
  if (!phoneId) throw new Error('WhatsApp Cloud phone_number_id missing');
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: req.to,
      type: 'text',
      text: { body: req.message ?? '' }
    })
  });
  if (!res.ok) throw new Error(`WhatsApp Cloud ${res.status}`);
  const data = (await res.json()) as { messages?: { id: string }[] };
  return { id: data.messages?.[0]?.id ?? null, provider: 'wa-cloud' };
}
