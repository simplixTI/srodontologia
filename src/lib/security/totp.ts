import 'server-only';
import { createHmac, randomBytes, createHash } from 'crypto';

/**
 * RFC 6238 TOTP + RFC 4226 HOTP without external deps.
 *
 * Secret is base32-encoded. Codes are 6 digits, 30-second period, SHA1.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateSecret(): string {
  const raw = randomBytes(20);
  return base32Encode(raw);
}

export function generateBackupCodes(n = 10): { plain: string[]; hashed: string[] } {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < n; i++) {
    const code = randomBytes(5).toString('hex').toUpperCase(); // 10 chars
    plain.push(code);
    hashed.push(sha256(code));
  }
  return { plain, hashed };
}

export function verifyBackupCode(plainCode: string, hashedCodes: string[]): number | null {
  const hash = sha256(plainCode.replace(/\s+/g, '').toUpperCase());
  const idx = hashedCodes.indexOf(hash);
  return idx >= 0 ? idx : null;
}

export function totpVerify(secret: string, code: string, window = 1): boolean {
  const clean = (code ?? '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(clean)) return false;
  const key = base32Decode(secret);
  const step = 30;
  const t = Math.floor(Date.now() / 1000 / step);
  for (let offset = -window; offset <= window; offset++) {
    if (hotp(key, t + offset) === clean) return true;
  }
  return false;
}

export function otpauthUri(input: {
  secret: string;
  accountName: string;
  issuer: string;
}): string {
  const params = new URLSearchParams();
  params.set('secret', input.secret);
  params.set('issuer', input.issuer);
  params.set('algorithm', 'SHA1');
  params.set('digits', '6');
  params.set('period', '30');
  return `otpauth://totp/${encodeURIComponent(input.issuer)}:${encodeURIComponent(input.accountName)}?${params.toString()}`;
}

function hotp(key: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  return output;
}

function base32Decode(s: string): Buffer {
  const clean = s.replace(/=+$/, '').toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    const i = BASE32_ALPHABET.indexOf(ch);
    if (i === -1) continue;
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

// Envelope encryption: XOR with a key derived from TOTP_SECRET_KEY env.
// Not military-grade but keeps db dumps unusable without env. Rotate the key
// by re-encrypting all secrets. For production, migrate to KMS.
export function encryptSecret(plain: string): string {
  const key = deriveKey();
  const raw = Buffer.from(plain, 'utf8');
  const out = Buffer.alloc(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw[i] ^ key[i % key.length];
  return out.toString('base64');
}

export function decryptSecret(enc: string): string {
  const key = deriveKey();
  const raw = Buffer.from(enc, 'base64');
  const out = Buffer.alloc(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw[i] ^ key[i % key.length];
  return out.toString('utf8');
}

function deriveKey(): Buffer {
  const k = process.env.TOTP_SECRET_KEY ?? 'dev-fallback-key-do-not-use-in-production';
  return createHash('sha256').update(k).digest();
}
