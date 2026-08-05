import { describe, it, expect } from 'vitest';
import { _internal } from '../src/lib/sessions/device-recognition';

const { classifyIp, classifyUA, fingerprint } = _internal;

/**
 * Pure-function tests for the device fingerprint components.
 * The full recogniseDevice() flow hits Supabase — covered in integration
 * layer separately.
 */
describe('device-recognition · classifyIp', () => {
  it('coarsens IPv4 to /16 prefix', () => {
    expect(classifyIp('192.168.1.10')).toBe('192.168');
    expect(classifyIp('10.20.30.40')).toBe('10.20');
  });

  it('coarsens IPv6 to first 3 hextets', () => {
    expect(classifyIp('2001:db8:85a3:0000:0000:8a2e:0370:7334')).toBe('2001:db8:85a3');
  });

  it('returns unknown for null/empty', () => {
    expect(classifyIp(null)).toBe('unknown');
    expect(classifyIp('')).toBe('unknown');
  });

  it('returns invalid for malformed IPv4', () => {
    expect(classifyIp('999.abc.def')).toBe('invalid');
  });
});

describe('device-recognition · classifyUA', () => {
  it('detects Chrome on Windows', () => {
    const r = classifyUA('Mozilla/5.0 (Windows NT 10.0; Win64) AppleWebKit/537.36 Chrome/120.0');
    expect(r).toEqual({ browser: 'Chrome', os: 'Windows' });
  });
  it('detects Safari on macOS', () => {
    const r = classifyUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15');
    expect(r).toEqual({ browser: 'Safari', os: 'macOS' });
  });
  it('detects Firefox on Linux', () => {
    const r = classifyUA('Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0');
    expect(r).toEqual({ browser: 'Firefox', os: 'Linux' });
  });
  it('detects Edge (not Chrome)', () => {
    const r = classifyUA('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120 Edg/120.0');
    expect(r.browser).toBe('Edge');
  });
});

describe('device-recognition · fingerprint stability', () => {
  it('same inputs → same fingerprint', () => {
    const a = fingerprint('Chrome', 'Windows', '192.168');
    const b = fingerprint('Chrome', 'Windows', '192.168');
    expect(a).toBe(b);
    expect(a).toHaveLength(32);
  });

  it('different browser → different fingerprint', () => {
    expect(fingerprint('Chrome', 'Windows', '192.168'))
      .not.toBe(fingerprint('Firefox', 'Windows', '192.168'));
  });

  it('different IP class → different fingerprint (network changed)', () => {
    expect(fingerprint('Chrome', 'Windows', '192.168'))
      .not.toBe(fingerprint('Chrome', 'Windows', '10.20'));
  });
});
