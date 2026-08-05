'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { reviewOcrAction } from '@/features/ocr/actions';
import type { OcrExtractionRow } from '@/features/ocr/queries';

export function OcrReviewList({
  items,
  mode
}: {
  items: OcrExtractionRow[];
  mode: 'review' | 'readonly';
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center text-xs text-white/50">
        Nada por aqui.
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {items.map((it) => (
        <li key={it.id}>
          <ExtractionCard extraction={it} mode={mode} />
        </li>
      ))}
    </ul>
  );
}

function ExtractionCard({ extraction, mode }: { extraction: OcrExtractionRow; mode: 'review' | 'readonly' }) {
  const [expanded, setExpanded] = useState(false);
  const [fields, setFields] = useState<Record<string, unknown>>(
    (extraction.fields as Record<string, unknown>) ?? {}
  );
  const [pending, start] = useTransition();

  const submit = (action: 'confirm' | 'reject') => {
    start(async () => {
      const res = await reviewOcrAction({ extraction_id: extraction.id, fields, action });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha na revisão.');
        return;
      }
      toast.success(action === 'confirm' ? 'Extração confirmada.' : 'Extração descartada.');
    });
  };

  return (
    <div className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/40">
            {extraction.target} · {extraction.provider ?? 'mock'} ·{' '}
            {extraction.confidence != null ? `${Math.round(extraction.confidence * 100)}% conf.` : 'sem conf.'}
          </div>
          {extraction.case ? (
            <Link
              href={`/casos/${extraction.case_id}`}
              className="mt-1 block truncate text-sm text-white hover:text-gold-100"
            >
              {extraction.case.case_number} · {extraction.case.title}
            </Link>
          ) : (
            <div className="mt-1 text-sm text-white">(sem caso vinculado)</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded-full border border-white/15 px-3 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-white/70 hover:border-gold/40 hover:text-gold-100"
        >
          {expanded ? 'Fechar' : 'Ver detalhes'}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 flex flex-col gap-4">
          <FieldEditor fields={fields} onChange={setFields} readOnly={mode === 'readonly'} />

          {extraction.raw_text && (
            <details>
              <summary className="cursor-pointer text-[0.55rem] uppercase tracking-[0.28em] text-white/50">
                Texto bruto
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/70">
                {extraction.raw_text}
              </pre>
            </details>
          )}

          {mode === 'review' && (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => submit('reject')}
                disabled={pending}
                className="rounded-full border border-white/15 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-white/70 hover:border-white/30 hover:text-white disabled:opacity-50"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={() => submit('confirm')}
                disabled={pending}
                className="rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 hover:bg-gold/20 disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FieldEditor({
  fields,
  onChange,
  readOnly
}: {
  fields: Record<string, unknown>;
  onChange: (fields: Record<string, unknown>) => void;
  readOnly: boolean;
}) {
  const entries = Object.entries(fields);
  if (entries.length === 0) {
    return <div className="text-xs text-white/50">Nenhum campo extraído.</div>;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {entries.map(([k, v]) => (
        <label key={k} className="flex flex-col gap-1">
          <span className="text-[0.5rem] uppercase tracking-[0.28em] text-white/50">{k}</span>
          {Array.isArray(v) ? (
            <input
              type="text"
              readOnly={readOnly}
              value={(v as string[]).join(', ')}
              onChange={(e) =>
                onChange({ ...fields, [k]: e.target.value.split(',').map((s) => s.trim()) })
              }
              className="h-9 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
            />
          ) : (
            <input
              type="text"
              readOnly={readOnly}
              value={typeof v === 'string' || typeof v === 'number' ? String(v) : JSON.stringify(v ?? '')}
              onChange={(e) => onChange({ ...fields, [k]: e.target.value })}
              className="h-9 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
            />
          )}
        </label>
      ))}
    </div>
  );
}
