import 'server-only';
import type { CaptchaProvider } from '../types';

/**
 * Cloudflare Turnstile adapter. Free, privacy-friendly.
 * Requires:
 *   TURNSTILE_SITE_KEY   (client-safe, exposed in HTML)
 *   TURNSTILE_SECRET_KEY (server-only)
 */
export function createTurnstileProvider(): CaptchaProvider {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
  const secret = process.env.TURNSTILE_SECRET_KEY ?? '';

  return {
    id: 'turnstile',
    displayName: 'Cloudflare Turnstile',
    siteKey,
    async verify({ token, remoteIp }) {
      if (!secret) {
        return { ok: false, provider: 'turnstile', reason: 'secret_missing' };
      }
      const body = new URLSearchParams();
      body.set('secret', secret);
      body.set('response', token);
      if (remoteIp) body.set('remoteip', remoteIp);

      try {
        const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
          signal: AbortSignal.timeout(6000)
        });
        if (!res.ok) return { ok: false, provider: 'turnstile', reason: `http_${res.status}` };
        const data = (await res.json()) as {
          success: boolean;
          hostname?: string;
          'error-codes'?: string[];
        };
        return {
          ok: !!data.success,
          provider: 'turnstile',
          hostname: data.hostname,
          errorCodes: data['error-codes']
        };
      } catch (err) {
        return { ok: false, provider: 'turnstile', reason: err instanceof Error ? err.message : 'network_error' };
      }
    }
  };
}
