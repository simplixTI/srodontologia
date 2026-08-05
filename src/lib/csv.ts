/**
 * CSV helpers — RFC 4180 conformant.
 * Header inference happens automatically from first row's keys.
 */

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  opts?: { headers?: string[] }
): string {
  if (rows.length === 0) return '';
  const headers = opts?.headers ?? Object.keys(rows[0]);
  const lines: string[] = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCell((r as Record<string, unknown>)[h])).join(','));
  }
  return lines.join('\r\n');
}
