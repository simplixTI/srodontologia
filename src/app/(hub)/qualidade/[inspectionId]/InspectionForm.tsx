'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  cancelInspectionAction,
  finalizeInspectionAction,
  updateInspectionItemAction,
  updateOverallNotesAction
} from '@/features/qc/actions';
import type { QcInspection, QcInspectionItem, QcItemResult } from '@/features/qc/types';
import { QC_ITEM_RESULT_LABELS } from '@/features/qc/types';

type Props = {
  inspection: QcInspection;
  initialItems: QcInspectionItem[];
  readOnly: boolean;
};

const RESULTS: QcItemResult[] = ['pending', 'pass', 'fail', 'na'];

const RESULT_STYLES: Record<QcItemResult, string> = {
  pending: 'border-white/20 text-white/60',
  pass: 'border-emerald-400/40 text-emerald-200 bg-emerald-400/10',
  fail: 'border-red-400/40 text-red-200 bg-red-400/10',
  na: 'border-white/10 text-white/40'
};

export function InspectionForm({ inspection, initialItems, readOnly }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<QcInspectionItem[]>(initialItems);
  const [overallNotes, setOverallNotes] = useState(inspection.overall_notes ?? '');
  const [pending, startTransition] = useTransition();

  function updateResult(itemId: string, result: QcItemResult) {
    const prev = items.find((i) => i.id === itemId)?.result ?? 'pending';
    setItems((s) => s.map((i) => (i.id === itemId ? { ...i, result } : i)));
    startTransition(async () => {
      try {
        await updateInspectionItemAction({ item_id: itemId, result });
      } catch (e) {
        setItems((s) => s.map((i) => (i.id === itemId ? { ...i, result: prev } : i)));
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  function updateReason(itemId: string, reason: string) {
    setItems((s) => s.map((i) => (i.id === itemId ? { ...i, reason } : i)));
  }

  function saveReason(item: QcInspectionItem) {
    startTransition(async () => {
      try {
        await updateInspectionItemAction({
          item_id: item.id,
          result: item.result,
          reason: item.reason,
          notes: item.notes
        });
      } catch (e) {
        toast.error('Falha ao salvar motivo', { description: (e as Error).message });
      }
    });
  }

  function persistOverall() {
    startTransition(async () => {
      try {
        await updateOverallNotesAction(inspection.id, overallNotes.trim() || null);
        toast.success('Notas salvas');
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  function finalize() {
    const pendingItems = items.filter((i) => i.result === 'pending').length;
    if (pendingItems > 0 && !confirm(`Existem ${pendingItems} item(s) sem resultado. Finalizar mesmo assim?`)) {
      return;
    }
    startTransition(async () => {
      try {
        const status = await finalizeInspectionAction({
          inspection_id: inspection.id,
          overall_notes: overallNotes.trim() || null
        });
        toast.success(status === 'passed' ? 'Inspeção aprovada' : 'Reprovada — cartão movido para retrabalho');
        router.refresh();
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  function cancel() {
    if (!confirm('Cancelar esta inspeção? Não poderá ser retomada.')) return;
    startTransition(async () => {
      try {
        await cancelInspectionAction(inspection.id);
        toast.success('Inspeção cancelada');
        router.refresh();
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  const fails = items.filter((i) => i.result === 'fail').length;
  const passes = items.filter((i) => i.result === 'pass').length;
  const nas = items.filter((i) => i.result === 'na').length;
  const criticalFails = items.filter((i) => i.result === 'fail' && i.is_critical).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-2 text-center text-[0.6rem] uppercase tracking-[0.2em] text-white/40">
        <div className="rounded-xl border border-gold/10 bg-white/[0.02] p-3">
          <div>Total</div>
          <div className="mt-1 font-display text-2xl text-white">{items.length}</div>
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
          <div>OK</div>
          <div className="mt-1 font-display text-2xl text-emerald-200">{passes}</div>
        </div>
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3">
          <div>Falhas</div>
          <div className="mt-1 font-display text-2xl text-red-200">
            {fails}
            {criticalFails > 0 && <span className="ml-1 text-[0.55rem]">({criticalFails} crít.)</span>}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div>N/A</div>
          <div className="mt-1 font-display text-2xl text-white/40">{nas}</div>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {items.map((i) => (
          <li key={i.id} className="rounded-xl border border-gold/10 bg-white/[0.02] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm text-white">
                  {i.label}
                  {i.is_critical && (
                    <span className="rounded-full border border-red-400/40 bg-red-400/10 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.15em] text-red-200">
                      crítico
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                {RESULTS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={readOnly}
                    onClick={() => updateResult(i.id, r)}
                    className={
                      'rounded-full border px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.15em] transition ' +
                      (i.result === r ? RESULT_STYLES[r] : 'border-white/10 text-white/40 hover:border-white/30')
                    }
                  >
                    {QC_ITEM_RESULT_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
            {i.result === 'fail' && (
              <input
                value={i.reason ?? ''}
                onChange={(e) => updateReason(i.id, e.target.value)}
                onBlur={() => saveReason(i)}
                disabled={readOnly}
                placeholder="Motivo da falha (obrigatório para retrabalho)"
                className="input-dark mt-2 h-9 w-full rounded-xl px-3 text-sm"
              />
            )}
          </li>
        ))}
      </ul>

      <section className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
        <h2 className="mb-3 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">Observações gerais</h2>
        <textarea
          value={overallNotes}
          onChange={(e) => setOverallNotes(e.target.value)}
          onBlur={persistOverall}
          disabled={readOnly}
          rows={3}
          className="input-dark w-full rounded-xl px-3 py-2 text-sm"
        />
      </section>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="h-10 rounded-full border border-white/10 px-5 text-[0.65rem] uppercase tracking-[0.22em] text-white/60 hover:border-white/30"
          >
            Cancelar inspeção
          </button>
          <button
            type="button"
            onClick={finalize}
            disabled={pending}
            className={
              'ml-auto inline-flex h-11 items-center gap-2 rounded-full px-6 text-[0.7rem] uppercase tracking-[0.22em] ' +
              (fails > 0
                ? 'border border-red-400/40 bg-red-400/10 text-red-200 hover:bg-red-400/20'
                : 'btn-gold')
            }
          >
            {fails > 0 ? (
              <>
                <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
                Reprovar e enviar para retrabalho
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                Aprovar
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
