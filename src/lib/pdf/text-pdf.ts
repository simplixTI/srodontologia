/**
 * Minimal, dependency-free PDF encoder.
 *
 * Produces a single-page A4 PDF from a list of text lines. Sufficient for
 * quotes/planning/receipts drafts. Not intended for design-heavy documents
 * — for those we can plug in a proper renderer later.
 *
 * Keeps zero third-party deps to avoid new supply-chain surface.
 */

export type PdfLine = { text: string; bold?: boolean };

export function renderSimplePdf(title: string, lines: PdfLine[]): Uint8Array {
  const enc = new TextEncoder();
  const stream = buildContentStream(title, lines);
  const pdf = assemble(stream);
  return enc.encode(pdf);
}

function escapePdfString(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n]+/g, ' ');
}

function buildContentStream(title: string, lines: PdfLine[]): string {
  const commands: string[] = [];
  commands.push('BT');
  commands.push('/F2 18 Tf');
  commands.push('72 780 Td');
  commands.push(`(${escapePdfString(title)}) Tj`);
  commands.push('ET');

  let y = 750;
  for (const line of lines) {
    commands.push('BT');
    commands.push(line.bold ? '/F2 11 Tf' : '/F1 11 Tf');
    commands.push(`72 ${y} Td`);
    commands.push(`(${escapePdfString(line.text)}) Tj`);
    commands.push('ET');
    y -= 16;
    if (y < 60) break;
  }
  return commands.join('\n');
}

function assemble(stream: string): string {
  const objs: string[] = [];
  const push = (body: string) => objs.push(body);
  push('<< /Type /Catalog /Pages 2 0 R >>');
  push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  push(
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>'
  );
  push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  let offset = 0;
  const header = '%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n';
  offset += header.length;

  const xref: number[] = [];
  const body: string[] = [];
  for (let i = 0; i < objs.length; i++) {
    xref.push(offset);
    const s = `${i + 1} 0 obj\n${objs[i]}\nendobj\n`;
    body.push(s);
    offset += s.length;
  }
  const startxref = offset;
  const xrefLines = [
    'xref',
    `0 ${objs.length + 1}`,
    '0000000000 65535 f '
  ];
  for (const o of xref) xrefLines.push(`${String(o).padStart(10, '0')} 00000 n `);
  const trailer = `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
  return header + body.join('') + xrefLines.join('\n') + '\n' + trailer;
}
