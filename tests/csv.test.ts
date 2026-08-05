import { describe, it, expect } from 'vitest';
import { toCsv } from '../src/lib/csv';

describe('toCsv', () => {
  it('returns empty string for empty input', () => {
    expect(toCsv([])).toBe('');
  });

  it('emits header line and rows', () => {
    const csv = toCsv([{ a: 1, b: 'foo' }, { a: 2, b: 'bar' }]);
    expect(csv).toBe('a,b\r\n1,foo\r\n2,bar');
  });

  it('escapes cells with comma', () => {
    const csv = toCsv([{ x: 'a,b' }]);
    expect(csv).toBe('x\r\n"a,b"');
  });

  it('escapes cells with quotes', () => {
    const csv = toCsv([{ x: 'quote "here"' }]);
    expect(csv).toBe('x\r\n"quote ""here"""');
  });

  it('escapes cells with newlines', () => {
    const csv = toCsv([{ x: 'line1\nline2' }]);
    expect(csv).toContain('"line1\nline2"');
  });

  it('handles null and undefined as empty', () => {
    const csv = toCsv([{ a: null, b: undefined, c: 0 }]);
    expect(csv).toBe('a,b,c\r\n,,0');
  });

  it('uses first row keys as headers when not provided', () => {
    const csv = toCsv([{ nome: 'X', valor: 10 }]);
    expect(csv.startsWith('nome,valor')).toBe(true);
  });

  it('respects opts.headers order', () => {
    const csv = toCsv([{ a: 1, b: 2, c: 3 }], { headers: ['c', 'a'] });
    expect(csv).toBe('c,a\r\n3,1');
  });
});
