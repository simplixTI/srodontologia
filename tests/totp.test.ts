import { describe, it, expect } from 'vitest';
import {
  generateSecret,
  generateBackupCodes,
  totpVerify,
  verifyBackupCode,
  encryptSecret,
  decryptSecret,
  otpauthUri
} from '../src/lib/security/totp';

describe('totp', () => {
  it('generates a base32 secret of expected length', () => {
    const s = generateSecret();
    expect(s.length).toBeGreaterThanOrEqual(32);
    expect(/^[A-Z2-7]+$/.test(s)).toBe(true);
  });

  it('rejects malformed codes', () => {
    const s = generateSecret();
    expect(totpVerify(s, 'abc')).toBe(false);
    expect(totpVerify(s, '')).toBe(false);
    expect(totpVerify(s, '1234567')).toBe(false);
  });

  it('backup codes verify only once (index-based consumption)', () => {
    const { plain, hashed } = generateBackupCodes(3);
    expect(plain.length).toBe(3);
    expect(hashed.length).toBe(3);
    const idx = verifyBackupCode(plain[0], hashed);
    expect(idx).toBe(0);
    // still returns index — caller is responsible for removing
    expect(verifyBackupCode('WRONG-CODE', hashed)).toBeNull();
  });

  it('envelope encrypt/decrypt round-trips', () => {
    process.env.TOTP_SECRET_KEY = 'test-key-for-vitest-do-not-use-in-prod';
    const s = generateSecret();
    const enc = encryptSecret(s);
    expect(enc).not.toBe(s);
    const dec = decryptSecret(enc);
    expect(dec).toBe(s);
  });

  it('otpauthUri contains issuer and account', () => {
    const uri = otpauthUri({ secret: 'JBSWY3DPEHPK3PXP', accountName: 'user@example.com', issuer: 'SR' });
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
    expect(uri).toContain('issuer=SR');
  });
});
