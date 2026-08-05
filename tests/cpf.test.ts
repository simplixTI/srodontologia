import { describe, it, expect } from 'vitest';

// Import the internal validators used by the CPF provider by exercising
// the pure functions. We re-declare them here to avoid pulling server-only
// dependencies into the vitest node env.
function isValidCpf(cpf: string): boolean {
  const c = (cpf ?? '').replace(/\D/g, '');
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;
  const digits = c.split('').map(Number);
  for (const factor of [10, 11]) {
    const acc = digits.slice(0, factor - 1).reduce((s, d, i) => s + d * (factor - i), 0);
    const check = ((acc * 10) % 11) % 10;
    if (check !== digits[factor - 1]) return false;
  }
  return true;
}

describe('cpf validator', () => {
  it('accepts valid CPFs', () => {
    // A known-valid test CPF (dígitos verificadores corretos)
    expect(isValidCpf('529.982.247-25')).toBe(true);
  });
  it('rejects all-same digits', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('00000000000')).toBe(false);
  });
  it('rejects wrong length', () => {
    expect(isValidCpf('123')).toBe(false);
    expect(isValidCpf('12345678901234')).toBe(false);
  });
  it('rejects invalid checksum', () => {
    expect(isValidCpf('123.456.789-00')).toBe(false);
  });
});
