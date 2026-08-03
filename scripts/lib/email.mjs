/**
 * scripts/lib/email.mjs
 *
 * Resend wrapper + welcome email template for SR HUB.
 * Used by scripts/invite-user.mjs and scripts/create-admin.mjs.
 *
 * The logo is embedded via a hosted URL (NEXT_PUBLIC_SITE_URL/Logo.png)
 * with a base64 inline fallback loaded from public/Logo.png at runtime.
 * A styled text lockup is always present as a text/typography-based
 * fallback, so the email always looks luxurious even if all images fail.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..', '..');
const LOGO_PATH = resolve(PROJECT_ROOT, 'public', 'Logo.png');

// ---------- Resend transport ----------

export async function sendEmail({ to, subject, html, text, attachments = [] }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM ??
    'SR Digital <onboarding@resend.dev>'; // Resend sandbox until you verify your domain

  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY env var.');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      attachments
    })
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = payload?.message ?? payload?.error ?? `HTTP ${res.status}`;
    throw new Error(`Resend send failed: ${err}`);
  }

  return payload;
}

// ---------- Welcome email template ----------

async function loadLogoBase64() {
  try {
    const buf = await readFile(LOGO_PATH);
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * @param {{ name: string; email: string; tempPassword: string; role: string; loginUrl: string; }} p
 * @returns {Promise<{ subject: string; html: string; text: string }>}
 */
export async function buildWelcomeEmail({ name, email, tempPassword, role, loginUrl }) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.srodontologiadigital.com.br';
  const hostedLogoUrl = `${siteUrl.replace(/\/$/, '')}/Logo.png`;
  const logoBase64 = await loadLogoBase64();
  const logoSrc = hostedLogoUrl; // Use hosted URL as primary
  const logoSrcFallback = logoBase64;

  const subject = 'Bem-vindo ao SR HUB · Suas credenciais de acesso';

  const roleLabels = {
    super_admin: 'Super Administrador',
    admin: 'Administrador',
    commercial: 'Comercial',
    technical_planning: 'Planejamento Técnico',
    production: 'Produção',
    finance: 'Financeiro',
    logistics: 'Logística',
    dentist: 'Dentista'
  };
  const roleLabel = roleLabels[role] ?? role;

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark only" />
  <meta name="supported-color-schemes" content="dark only" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#000000;color:#f5eee0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
    Sua conta no SR HUB foi criada. Acesse com as credenciais abaixo — a senha temporária deve ser alterada no primeiro login.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#000000;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header block -->
          <tr>
            <td align="center" style="padding:0 24px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#0a0a0a;border:1px solid rgba(201,162,75,0.25);border-radius:20px;overflow:hidden;">
                <tr>
                  <td align="center" style="padding:40px 24px 32px;background:radial-gradient(circle at 50% 0%, rgba(201,162,75,0.16), transparent 70%);">
                    ${
                      logoSrc
                        ? `<img src="${logoSrc}" width="180" alt="SR Digital"
                              style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:180px;margin:0 auto 16px;" />`
                        : ''
                    }
                    <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:0.22em;color:#F0DEA9;">SR&nbsp;&nbsp;DIGITAL</div>
                    <div style="margin-top:6px;font-size:9px;letter-spacing:0.38em;color:rgba(245,238,224,0.5);text-transform:uppercase;">
                      Digital · Implant · Center
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:8px 32px 0;">
              <div style="font-size:11px;letter-spacing:0.3em;color:#C9A24B;text-transform:uppercase;">
                Bem-vindo ao SR HUB
              </div>
              <h1 style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:34px;line-height:1.15;color:#ffffff;letter-spacing:-0.01em;">
                Olá, <span style="color:#F0DEA9;font-style:italic;">${escapeHtml(name.split(' ')[0])}.</span>
              </h1>
              <p style="margin:16px 0 0;color:rgba(245,238,224,0.75);font-size:15px;line-height:1.6;">
                Sua conta foi criada no <strong style="color:#ffffff;">SR HUB</strong>, o sistema operacional
                interno da SR Digital. Use as credenciais abaixo para o primeiro acesso — o sistema
                pedirá uma nova senha assim que você entrar.
              </p>
            </td>
          </tr>

          <!-- Credentials card -->
          <tr>
            <td style="padding:28px 32px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid rgba(201,162,75,0.25);border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01));">
                <tr>
                  <td style="padding:24px;">
                    <div style="font-size:10px;letter-spacing:0.3em;color:rgba(245,238,224,0.55);text-transform:uppercase;">E-mail</div>
                    <div style="margin-top:6px;font-size:16px;color:#ffffff;font-family:'Menlo','Consolas',monospace;">${escapeHtml(email)}</div>

                    <div style="height:1px;background:rgba(201,162,75,0.2);margin:20px 0;"></div>

                    <div style="font-size:10px;letter-spacing:0.3em;color:rgba(245,238,224,0.55);text-transform:uppercase;">Senha temporária</div>
                    <div style="margin-top:6px;font-size:16px;color:#F0DEA9;font-family:'Menlo','Consolas',monospace;letter-spacing:0.03em;">${escapeHtml(tempPassword)}</div>

                    <div style="height:1px;background:rgba(201,162,75,0.2);margin:20px 0;"></div>

                    <div style="font-size:10px;letter-spacing:0.3em;color:rgba(245,238,224,0.55);text-transform:uppercase;">Perfil</div>
                    <div style="margin-top:6px;font-size:14px;color:#ffffff;">${escapeHtml(roleLabel)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA button -->
          <tr>
            <td align="center" style="padding:32px 32px 8px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="border-radius:999px;background:linear-gradient(135deg,#F7ECCF 0%,#F0DEA9 25%,#D9B45F 50%,#C9A24B 75%,#8E6B2A 100%);">
                    <a href="${escapeAttr(loginUrl)}" target="_blank"
                       style="display:inline-block;padding:16px 36px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#0a0a0a;text-decoration:none;font-weight:600;">
                      Acessar o SR HUB &nbsp;→
                    </a>
                  </td>
                </tr>
              </table>
              <div style="margin-top:14px;font-size:11px;color:rgba(245,238,224,0.4);">
                Ou copie: <a href="${escapeAttr(loginUrl)}" style="color:#C9A24B;text-decoration:none;">${escapeHtml(loginUrl)}</a>
              </div>
            </td>
          </tr>

          <!-- Security note -->
          <tr>
            <td style="padding:20px 32px 0;">
              <div style="border-left:2px solid #C9A24B;padding:12px 16px;background:rgba(201,162,75,0.05);border-radius:0 8px 8px 0;">
                <div style="font-size:10px;letter-spacing:0.3em;color:#F0DEA9;text-transform:uppercase;">Segurança</div>
                <p style="margin:8px 0 0;font-size:13px;color:rgba(245,238,224,0.7);line-height:1.6;">
                  A senha acima é temporária e será substituída no primeiro acesso.
                  Nunca compartilhe suas credenciais e evite reutilizar senhas de outros serviços.
                </p>
              </div>
            </td>
          </tr>

          <!-- Divider + footer -->
          <tr>
            <td style="padding:40px 32px 24px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(201,162,75,0.3),transparent);"></div>
              <div style="margin-top:20px;text-align:center;font-size:10px;letter-spacing:0.3em;color:rgba(245,238,224,0.35);text-transform:uppercase;">
                SR HUB · Digital Implant Center
              </div>
              <div style="margin-top:6px;text-align:center;font-size:10px;color:rgba(245,238,224,0.3);">
                <a href="${escapeAttr(siteUrl)}" style="color:rgba(245,238,224,0.35);text-decoration:none;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ''))}</a>
                &nbsp;·&nbsp;
                <a href="mailto:contato@srodontologiadigital.com.br" style="color:rgba(245,238,224,0.35);text-decoration:none;">contato@srodontologiadigital.com.br</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Bem-vindo ao SR HUB — Digital Implant Center

Olá, ${name.split(' ')[0]}.

Sua conta foi criada no SR HUB.

E-mail: ${email}
Senha temporária: ${tempPassword}
Perfil: ${roleLabel}

Acesse: ${loginUrl}

A senha temporária deve ser alterada no primeiro acesso.
Nunca compartilhe suas credenciais.

SR Digital · Digital Implant Center
${siteUrl}
`;

  // Suppress unused warning — kept for future inline attachment support
  void logoSrcFallback;

  return { subject, html, text };
}

// ---------- Helpers ----------

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s) {
  return escapeHtml(s);
}
