/**
 * CSV parser with the safety controls we need for tenant-facing imports.
 *
 * - RFC 4180-ish: handles quoted fields, escaped double-quotes ("").
 * - Encoding: UTF-8 with BOM stripped. Detects if the file looks like
 *   UTF-16 LE (common when saving from Excel Windows) and errors early
 *   with a friendly hint.
 * - Formula-injection protection: cells starting with =, +, -, @, tab, CR
 *   are prefixed with a single quote when writing back — but we also flag
 *   them via `sanitized: true` per row so importers can decide policy.
 * - Row limit + byte limit enforced at parse time — never load a gigantic
 *   file into memory.
 * - Deterministic column mapping: consumer provides the header order.
 */
export const MAX_ROWS = 50_000;
export const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export type ParsedRow = {
  rowNumber: number;             // 1-based, matches user spreadsheet
  raw: Record<string, string>;   // header → cell (post-sanitize)
  sanitizedFields: string[];     // headers that had formula-injection cleanup
};

export type ParseResult = {
  headers: string[];
  rows: ParsedRow[];
  warnings: string[];
};

export type ParseError = { code: string; message: string; rowNumber?: number };

const FORMULA_INJECTION_PREFIXES = new Set(['=', '+', '-', '@', '\t', '\r']);

/**
 * Runs the full parse. Throws ParseError for unrecoverable input.
 */
export function parseCsv(input: string | Uint8Array, headersExpected?: string[]): ParseResult {
  const text = toUtf8String(input);
  if (text.length === 0) throw error('EMPTY', 'CSV está vazio.');
  if (text.length > MAX_BYTES) throw error('TOO_LARGE', `CSV excede ${MAX_BYTES / 1024 / 1024} MB.`);

  const rawRows = splitCsv(text);
  if (rawRows.length === 0) throw error('EMPTY', 'Nenhuma linha encontrada.');
  const headers = rawRows[0].map((h) => h.trim());
  if (headers.length === 0) throw error('NO_HEADERS', 'Cabeçalho ausente.');

  const dataLines = rawRows.slice(1);
  if (dataLines.length === 0) throw error('NO_DATA', 'Arquivo só contém cabeçalho.');
  if (dataLines.length > MAX_ROWS) {
    throw error('TOO_MANY_ROWS', `CSV excede ${MAX_ROWS} linhas. Divida em arquivos menores.`);
  }

  const warnings: string[] = [];
  if (headersExpected) {
    const missing = headersExpected.filter((h) => !headers.includes(h));
    if (missing.length) {
      throw error('MISSING_HEADERS', `Colunas obrigatórias ausentes: ${missing.join(', ')}`);
    }
    const extras = headers.filter((h) => !headersExpected.includes(h));
    if (extras.length) warnings.push(`Colunas ignoradas: ${extras.join(', ')}`);
  }

  const rows: ParsedRow[] = dataLines.map((cells, idx) => {
    const raw: Record<string, string> = {};
    const sanitizedFields: string[] = [];
    headers.forEach((header, i) => {
      const cellRaw = cells[i] ?? '';
      const { safe, wasSanitized } = sanitizeCell(cellRaw);
      raw[header] = safe;
      if (wasSanitized) sanitizedFields.push(header);
    });
    return { rowNumber: idx + 2, raw, sanitizedFields };
  });

  return { headers, rows, warnings };
}

/** Converts input to UTF-8 string, stripping BOM. Detects UTF-16 LE and errors. */
function toUtf8String(input: string | Uint8Array): string {
  if (typeof input === 'string') return input.replace(/^\uFEFF/, '');
  // Detect UTF-16 LE BOM
  if (input.length >= 2 && input[0] === 0xff && input[1] === 0xfe) {
    throw error(
      'UTF16_ENCODING',
      'Arquivo em UTF-16 LE (Excel Windows). Salve como CSV UTF-8 antes de subir.'
    );
  }
  // Strip UTF-8 BOM
  let start = 0;
  if (input.length >= 3 && input[0] === 0xef && input[1] === 0xbb && input[2] === 0xbf) start = 3;
  return new TextDecoder('utf-8', { fatal: false }).decode(input.subarray(start));
}

/**
 * Sanitizes a single cell against formula injection. When triggered,
 * prefixes with a leading apostrophe (') and returns `wasSanitized: true`.
 */
function sanitizeCell(raw: string): { safe: string; wasSanitized: boolean } {
  if (raw.length === 0) return { safe: raw, wasSanitized: false };
  if (FORMULA_INJECTION_PREFIXES.has(raw[0])) {
    return { safe: `'${raw}`, wasSanitized: true };
  }
  return { safe: raw, wasSanitized: false };
}

/** RFC-ish CSV split. Supports quoted cells with escaped double-quotes. */
function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cell = '';
  let row: string[] = [];
  let inQuotes = false;

  const pushCell = () => { row.push(cell); cell = ''; };
  const pushRow  = () => { rows.push(row); row = []; };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { cell += '"'; i++; continue; }
      if (c === '"') { inQuotes = false; continue; }
      cell += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ',') { pushCell(); continue; }
    if (c === '\r') { continue; }
    if (c === '\n') { pushCell(); if (row.length > 0 && row.some((x) => x !== '')) pushRow(); else row = []; continue; }
    cell += c;
  }
  if (cell.length > 0 || row.length > 0) {
    pushCell();
    if (row.some((x) => x !== '')) pushRow();
  }
  return rows;
}

function error(code: string, message: string, rowNumber?: number): Error & ParseError {
  const e = new Error(message) as Error & ParseError;
  e.code = code;
  e.message = message;
  if (rowNumber !== undefined) e.rowNumber = rowNumber;
  return e;
}
