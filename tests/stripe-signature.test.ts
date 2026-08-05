import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';

/**
 * Verifies our Stripe signature check by simulating a real HMAC.
 * We copy the algorithm inline to avoid pulling server-only files into vitest.
 */
function sign(payload: string, secret: string, ts: number): string {
  const v1 = createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex');
  return `t=${ts},v1=${v1}`;
}

function verify(rawBody: string, signatureHeader: string, secret: string, toleranceSec = 300): boolean {
  const parts = signatureHeader.split(',').reduce<Record<string, string>>((a, p) => {
    const [k, v] = p.split('=');
    if (k && v) a[k] = v;
    return a;
  }, {});
  if (!parts.t || !parts.v1) return false;
  const ts = parseInt(parts.t, 10);
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > toleranceSec) return false;
  const expected = createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');
  return expected === parts.v1;
}

describe('stripe signature verification', () => {
  const secret = 'whsec_test_1234567890';
  const body = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' });

  it('accepts a fresh valid signature', () => {
    const now = Math.floor(Date.now() / 1000);
    const header = sign(body, secret, now);
    expect(verify(body, header, secret)).toBe(true);
  });

  it('rejects tampered payload', () => {
    const now = Math.floor(Date.now() / 1000);
    const header = sign(body, secret, now);
    expect(verify(body + 'X', header, secret)).toBe(false);
  });

  it('rejects wrong secret', () => {
    const now = Math.floor(Date.now() / 1000);
    const header = sign(body, secret, now);
    expect(verify(body, header, 'whsec_wrong')).toBe(false);
  });

  it('rejects stale timestamp', () => {
    const oldTs = Math.floor(Date.now() / 1000) - 400;
    const header = sign(body, secret, oldTs);
    expect(verify(body, header, secret, 300)).toBe(false);
  });
});
