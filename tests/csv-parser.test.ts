import { describe, it, expect } from 'vitest';
import { parseCsv, MAX_ROWS, MAX_BYTES } from '../src/lib/import/csv-parser';

describe('csv-parser · basics', () => {
  it('parses a simple 3-row CSV with headers', () => {
    const csv = 'name,email\nAlice,a@x.com\nBob,b@x.com';
    const r = parseCsv(csv);
    expect(r.headers).toEqual(['name', 'email']);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0].raw).toEqual({ name: 'Alice', email: 'a@x.com' });
    expect(r.rows[0].rowNumber).toBe(2); // row 1 is header
  });

  it('handles quoted fields with commas', () => {
    const csv = 'name,note\n"Silva, João","olá, mundo"';
    const r = parseCsv(csv);
    expect(r.rows[0].raw).toEqual({ name: 'Silva, João', note: 'olá, mundo' });
  });

  it('handles escaped double-quotes inside quoted cells', () => {
    const csv = 'name\n"He said ""hi"""';
    const r = parseCsv(csv);
    expect(r.rows[0].raw.name).toBe('He said "hi"');
  });

  it('skips blank lines silently', () => {
    const csv = 'a,b\n\n\n1,2\n\n';
    const r = parseCsv(csv);
    expect(r.rows).toHaveLength(1);
  });

  it('strips UTF-8 BOM', () => {
    const csv = '\uFEFFname\nAlice';
    const r = parseCsv(csv);
    expect(r.headers).toEqual(['name']);
  });
});

describe('csv-parser · formula injection', () => {
  it('prefixes = with apostrophe and flags row', () => {
    const csv = 'formula\n=SUM(A1)';
    const r = parseCsv(csv);
    expect(r.rows[0].raw.formula).toBe("'=SUM(A1)");
    expect(r.rows[0].sanitizedFields).toEqual(['formula']);
  });

  it('sanitizes +, -, @, tab, CR prefixes', () => {
    const csv = 'a,b,c,d,e\n+1,-2,@x,\tv,\rz';
    const r = parseCsv(csv);
    expect(r.rows[0].raw.a).toBe("'+1");
    expect(r.rows[0].raw.b).toBe("'-2");
    expect(r.rows[0].raw.c).toBe("'@x");
    expect(r.rows[0].raw.d).toBe("'\tv");
    expect(r.rows[0].sanitizedFields.sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('does not touch benign leading chars', () => {
    const csv = 'name\nAlice';
    const r = parseCsv(csv);
    expect(r.rows[0].raw.name).toBe('Alice');
    expect(r.rows[0].sanitizedFields).toEqual([]);
  });
});

describe('csv-parser · headers enforcement', () => {
  it('throws on missing required header', () => {
    expect(() => parseCsv('name\nAlice', ['name', 'email'])).toThrow(/Colunas obrigatórias/);
  });

  it('warns (not throws) on extra headers', () => {
    const r = parseCsv('name,email,extra\nAlice,a@x.com,x', ['name', 'email']);
    expect(r.warnings.some((w) => w.includes('Colunas ignoradas'))).toBe(true);
  });
});

describe('csv-parser · encoding', () => {
  it('detects UTF-16 LE BOM and errors with a hint', () => {
    const utf16Bytes = new Uint8Array([0xff, 0xfe, 0x41, 0x00, 0x42, 0x00]);
    expect(() => parseCsv(utf16Bytes)).toThrow(/UTF-16 LE/);
  });

  it('accepts UTF-8 bytes with content', () => {
    const utf8 = new TextEncoder().encode('name\nAçaí');
    const r = parseCsv(utf8);
    expect(r.rows[0].raw.name).toBe('Açaí');
  });
});

describe('csv-parser · limits', () => {
  it('throws when byte length exceeds MAX_BYTES', () => {
    const big = 'a\n' + 'x'.repeat(MAX_BYTES);
    expect(() => parseCsv(big)).toThrow(/excede/);
  });

  it('throws when row count exceeds MAX_ROWS', () => {
    const lines = ['a'];
    for (let i = 0; i < MAX_ROWS + 5; i++) lines.push(String(i));
    expect(() => parseCsv(lines.join('\n'))).toThrow(/excede.*linhas/);
  });

  it('throws on empty content', () => {
    expect(() => parseCsv('')).toThrow(/vazio/);
  });

  it('throws on file with only header', () => {
    expect(() => parseCsv('a,b\n')).toThrow(/só contém cabeçalho/);
  });
});
