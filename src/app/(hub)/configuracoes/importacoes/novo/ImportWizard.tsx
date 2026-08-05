'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { startDryRunAction } from '@/features/import/actions';

type EntityOption = { key: 'clinics' | 'dentists' | 'patients' | 'cases'; label: string };

type DryRunOutcome = {
  ok: true;
  importId: string;
  totals: { total: number; ok: number; error: number; duplicate: number };
  errorsSample: Array<{ rowNumber: number; message: string }>;
  warnings: string[];
} | { ok: false; error: string } | null;

export function ImportWizard({ entities }: { entities: EntityOption[] }) {
  const [entity, setEntity] = useState<EntityOption['key']>(entities[0].key);
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<DryRunOutcome>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    if (!csv.trim()) { toast.error('Cole o conteúdo do CSV.'); return; }
    start(async () => {
      const res = await startDryRunAction({ entity, csv });
      setResult(res);
      if (!res.ok) toast.error(res.error);
      else toast.success(`Dry-run concluído: ${res.totals.ok} ok / ${res.totals.error} erros`);
    });
  };

  const onFile = async (f: File) => {
    if (f.size > 5 * 1024 * 1024) { toast.error('Arquivo excede 5 MB.'); return; }
    const text = await f.text();
    setCsv(text);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <label className="text-[0.55rem] uppercase tracking-[0.28em] text-white/60">Entidade</label>
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value as EntityOption['key'])}
          className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        >
          {entities.map((e) => (
            <option key={e.key} value={e.key}>{e.label}</option>
          ))}
        </select>

        <label className="mt-4 block text-[0.55rem] uppercase tracking-[0.28em] text-white/60">Arquivo CSV</label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          className="mt-2 text-xs text-white/70"
        />

        <label className="mt-4 block text-[0.55rem] uppercase tracking-[0.28em] text-white/60">Ou cole o CSV</label>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={12}
          spellCheck={false}
          placeholder="header1,header2,...&#10;valor,valor,..."
          className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-white/90"
        />

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={pending || csv.trim().length === 0}
            className="rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 disabled:opacity-50"
          >
            {pending ? 'Analisando…' : 'Executar dry-run'}
          </button>
          <span className="text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
            Dry-run não grava dados
          </span>
        </div>
      </div>

      {result && result.ok && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-[0.28em] text-white/60">Resultado do dry-run</h2>
            <span className="text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
              #{result.importId.slice(0, 8)}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3 text-sm">
            <Stat label="Total" value={result.totals.total} />
            <Stat label="OK" value={result.totals.ok} tone="ok" />
            <Stat label="Erros" value={result.totals.error} tone={result.totals.error ? 'err' : 'muted'} />
            <Stat label="Duplicadas" value={result.totals.duplicate} tone={result.totals.duplicate ? 'warn' : 'muted'} />
          </div>
          {result.warnings.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-amber-300">
              {result.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
            </ul>
          )}
          {result.errorsSample.length > 0 && (
            <div className="mt-4">
              <h3 className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">Primeiros erros</h3>
              <ul className="mt-2 space-y-1 font-mono text-[0.7rem] text-red-300">
                {result.errorsSample.map((e, i) => (
                  <li key={i}>linha {e.rowNumber}: {e.message}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-4 text-xs text-white/50">
            Para aplicar de fato, envie o arquivo pelo bucket privado `data-imports` e enfileire um job (documentado em docs/import-system.md).
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'err' | 'warn' | 'muted' }) {
  const color =
    tone === 'ok' ? 'text-emerald-300' :
    tone === 'err' ? 'text-red-300' :
    tone === 'warn' ? 'text-amber-300' :
    'text-white/80';
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
      <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/40">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}
