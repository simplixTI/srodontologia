'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  XCircle,
  Send,
  Copy
} from 'lucide-react';
import type { Quote } from '@/features/quotes/types';
import { QUOTE_STATUS_LABELS } from '@/features/quotes/types';
import type { QuoteItem } from '@/features/quotes/queries';
import {
  createQuoteAction,
  addQuoteItemAction,
  deleteQuoteItemAction,
  approveQuoteInternalAction,
  rejectQuoteAction,
  markQuoteSentAction,
  duplicateQuoteAction
} from '@/features/quotes/actions';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Field, Input, Submit } from '@/components/ui/Field';

export function QuotesTab({
  caseId,
  quotes,
  itemsByQuote
}: {
  caseId: string;
  quotes: Quote[];
  itemsByQuote: Map<string, QuoteItem[]>;
}) {
  const [openNew, setOpenNew] = useState(quotes.length === 0);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const confirm = useConfirm();

  const submitNew = (fd: FormData) => {
    setErr(null);
    startTransition(async () => {
      const res = await createQuoteAction(caseId, fd);
      if (!res.ok) setErr(res.error ?? 'Erro ao criar.');
      else {
        toast.success('Orçamento criado');
        setOpenNew(false);
        window.location.reload();
      }
    });
  };

  const doApprove = async (q: Quote) => {
    const ok = await confirm({
      title: `Aprovar orçamento ${q.quote_number} v${q.version_number}?`,
      description: `Total: R$ ${formatBRL(Number(q.total))}. Após aprovado, esta versão fica imutável.`,
      confirmLabel: 'Aprovar'
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await approveQuoteInternalAction(q.id, caseId);
        toast.success('Orçamento aprovado');
      } catch (e) {
        toast.error('Falha ao aprovar', { description: (e as Error).message });
      }
    });
  };

  const doReject = async (q: Quote) => {
    const ok = await confirm({
      title: 'Recusar orçamento?',
      description: `${q.quote_number} v${q.version_number} será marcado como recusado.`,
      confirmLabel: 'Recusar',
      tone: 'danger'
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await rejectQuoteAction(q.id, caseId);
        toast.success('Marcado como recusado');
      } catch (e) {
        toast.error('Erro', { description: (e as Error).message });
      }
    });
  };

  const doMarkSent = (q: Quote) => {
    startTransition(async () => {
      try {
        await markQuoteSentAction(q.id, caseId);
        toast.success('Orçamento marcado como enviado');
      } catch (e) {
        toast.error('Erro', { description: (e as Error).message });
      }
    });
  };

  const doDuplicate = async (q: Quote) => {
    const ok = await confirm({
      title: 'Duplicar orçamento?',
      description: `Uma nova versão será criada com base em ${q.quote_number} v${q.version_number}.`,
      confirmLabel: 'Duplicar'
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await duplicateQuoteAction(q.id, caseId);
      if (!res.ok) toast.error('Erro', { description: res.error });
      else toast.success('Nova versão criada');
      window.location.reload();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl text-white">Orçamentos</h3>
          <p className="mt-1 text-xs text-white/50">
            {quotes.length} versão{quotes.length !== 1 ? 'ões' : ''} · nova versão a cada alteração
          </p>
        </div>
        {!openNew && (
          <button
            onClick={() => setOpenNew(true)}
            className="btn-gold inline-flex h-10 items-center gap-2 rounded-full px-5 text-[0.65rem] uppercase tracking-[0.24em]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Nova versão
          </button>
        )}
      </div>

      {openNew && (
        <form action={submitNew} className="rounded-2xl border border-gold/20 bg-white/[0.02] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-display text-lg text-white">Nova versão do orçamento</h4>
            <button type="button" onClick={() => setOpenNew(false)} className="text-[0.6rem] uppercase tracking-[0.28em] text-white/50 hover:text-gold-100">
              cancelar
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Prazo estimado (dias)" htmlFor="estimated_days">
              <Input id="estimated_days" name="estimated_days" type="number" min={0} />
            </Field>
            <Field label="Validade" htmlFor="validity_date">
              <Input id="validity_date" name="validity_date" type="date" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Condições de pagamento" htmlFor="payment_terms">
                <Input id="payment_terms" name="payment_terms" placeholder="30/60 dias · PIX à vista com 5%" />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Observações públicas" htmlFor="public_notes">
                <textarea
                  id="public_notes"
                  name="public_notes"
                  rows={2}
                  className="w-full rounded-xl border border-gold/15 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25"
                />
              </Field>
            </div>
          </div>
          {err && <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{err}</p>}
          <div className="mt-4"><Submit pending={pending}>Criar rascunho</Submit></div>
        </form>
      )}

      {quotes.length === 0 && !openNew && (
        <p className="rounded-2xl border border-gold/10 bg-white/[0.02] p-8 text-center text-sm text-white/50">
          Nenhum orçamento gerado ainda.
        </p>
      )}

      {quotes.map((q) => {
        const items = itemsByQuote.get(q.id) ?? [];
        const isDraft = q.status === 'draft';
        const isSent = q.status === 'sent';
        const isApproved = q.status === 'approved';

        return (
          <div key={q.id} className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/20 bg-black/40">
                  <FileSpreadsheet className="h-4 w-4 text-gold-100" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-sm text-white">
                    {q.quote_number} <span className="text-white/40">· v{q.version_number}</span>
                  </div>
                  <div className="text-[0.6rem] uppercase tracking-[0.25em] text-white/40">
                    {new Date(q.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
              <span className={statusPill(q.status)}>
                {QUOTE_STATUS_LABELS[q.status]}
              </span>
            </div>

            {/* Items */}
            <div className="mt-4 rounded-xl border border-white/5 bg-black/30 overflow-hidden">
              {items.length === 0 && !isApproved && (
                <p className="p-4 text-center text-xs text-white/40">
                  Nenhum item ainda. Adicione o primeiro abaixo.
                </p>
              )}
              {items.length > 0 && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-[0.55rem] uppercase tracking-[0.25em] text-white/40">
                      <th className="py-2 pl-3 text-left">Descrição</th>
                      <th className="py-2 text-right">Qtd</th>
                      <th className="py-2 text-right">Unit.</th>
                      <th className="py-2 text-right">Desc.</th>
                      <th className="py-2 text-right">Total</th>
                      {!isApproved && <th className="py-2 w-10" />}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id} className="border-b border-white/5 text-white/80">
                        <td className="py-2 pl-3">{it.description}</td>
                        <td className="py-2 text-right">{it.quantity}</td>
                        <td className="py-2 text-right">R$ {formatBRL(Number(it.unit_price))}</td>
                        <td className="py-2 text-right">R$ {formatBRL(Number(it.discount))}</td>
                        <td className="py-2 pr-3 text-right text-white">R$ {formatBRL(Number(it.total))}</td>
                        {!isApproved && (
                          <td className="py-2">
                            <DeleteItemBtn itemId={it.id} quoteId={q.id} caseId={caseId} />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!isApproved && (
                <AddItemForm quoteId={q.id} caseId={caseId} />
              )}
            </div>

            {/* Totals */}
            <div className="mt-4 flex flex-wrap items-baseline gap-4 border-t border-white/5 pt-3">
              <div className="text-[0.55rem] uppercase tracking-[0.25em] text-white/40">Total</div>
              <span className="font-display text-2xl text-white">
                R$ {formatBRL(Number(q.total))}
              </span>
              {q.estimated_days != null && (
                <span className="text-[0.6rem] uppercase tracking-[0.25em] text-white/40">
                  · {q.estimated_days} dias
                </span>
              )}
              {q.payment_terms && (
                <span className="text-[0.6rem] uppercase tracking-[0.25em] text-white/40">
                  · {q.payment_terms}
                </span>
              )}
            </div>
            {q.public_notes && <p className="mt-3 text-xs text-white/60">{q.public_notes}</p>}

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              {isDraft && (
                <>
                  <button
                    onClick={() => doMarkSent(q)}
                    disabled={pending || items.length === 0}
                    title={items.length === 0 ? 'Adicione ao menos um item' : ''}
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 text-[0.6rem] uppercase tracking-[0.28em] text-sky-200 transition hover:bg-sky-400/15 disabled:opacity-40"
                  >
                    <Send className="h-3 w-3" strokeWidth={1.5} /> Marcar como enviado
                  </button>
                  <button
                    onClick={() => doApprove(q)}
                    disabled={pending || items.length === 0}
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 text-[0.6rem] uppercase tracking-[0.28em] text-emerald-200 transition hover:bg-emerald-400/15 disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} /> Aprovar internamente
                  </button>
                </>
              )}
              {isSent && (
                <>
                  <button
                    onClick={() => doApprove(q)}
                    disabled={pending}
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 text-[0.6rem] uppercase tracking-[0.28em] text-emerald-200 transition hover:bg-emerald-400/15 disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} /> Aprovar
                  </button>
                  <button
                    onClick={() => doReject(q)}
                    disabled={pending}
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-rose-400/30 bg-rose-400/10 px-4 text-[0.6rem] uppercase tracking-[0.28em] text-rose-200 transition hover:bg-rose-400/15 disabled:opacity-40"
                  >
                    <XCircle className="h-3 w-3" strokeWidth={1.5} /> Recusar
                  </button>
                </>
              )}
              <button
                onClick={() => doDuplicate(q)}
                disabled={pending}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-gold/25 px-4 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 transition hover:bg-gold/5 disabled:opacity-40"
              >
                <Copy className="h-3 w-3" strokeWidth={1.5} /> Duplicar como nova versão
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddItemForm({ quoteId, caseId }: { quoteId: string; caseId: string }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const submit = (fd: FormData) => {
    setErr(null);
    startTransition(async () => {
      const res = await addQuoteItemAction(quoteId, caseId, fd);
      if (!res.ok) setErr(res.error ?? 'Erro');
      else {
        toast.success('Item adicionado');
        // reset form fields
        (document.getElementById(`qi-desc-${quoteId}`) as HTMLInputElement)?.blur();
      }
    });
  };

  return (
    <form
      action={submit}
      className="grid grid-cols-2 gap-2 border-t border-white/5 p-3 md:grid-cols-[1fr_60px_100px_90px_auto]"
    >
      <input
        id={`qi-desc-${quoteId}`}
        name="description"
        required
        placeholder="Descrição do item"
        className="h-9 rounded-lg border border-gold/10 bg-black/40 px-3 text-xs text-white placeholder-white/30 focus:border-gold/50 focus:outline-none md:col-span-1"
      />
      <input
        name="quantity"
        type="number"
        min={1}
        step="0.01"
        defaultValue={1}
        placeholder="Qtd"
        className="h-9 rounded-lg border border-gold/10 bg-black/40 px-2 text-xs text-white focus:border-gold/50 focus:outline-none"
      />
      <input
        name="unit_price"
        type="number"
        min={0}
        step="0.01"
        placeholder="Valor un."
        className="h-9 rounded-lg border border-gold/10 bg-black/40 px-2 text-xs text-white focus:border-gold/50 focus:outline-none"
      />
      <input
        name="discount"
        type="number"
        min={0}
        step="0.01"
        defaultValue={0}
        placeholder="Desc."
        className="h-9 rounded-lg border border-gold/10 bg-black/40 px-2 text-xs text-white focus:border-gold/50 focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="btn-gold col-span-2 inline-flex h-9 items-center justify-center gap-1 rounded-full px-3 text-[0.55rem] uppercase tracking-[0.24em] disabled:opacity-60 md:col-span-1"
      >
        <Plus className="h-3 w-3" strokeWidth={2} /> {pending ? '...' : 'Add'}
      </button>
      {err && (
        <p className="col-span-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-1 text-[0.6rem] text-rose-200 md:col-span-5">
          {err}
        </p>
      )}
    </form>
  );
}

function DeleteItemBtn({ itemId, quoteId, caseId }: { itemId: string; quoteId: string; caseId: string }) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  return (
    <button
      disabled={pending}
      onClick={async () => {
        const ok = await confirm({
          title: 'Remover item?',
          confirmLabel: 'Remover',
          tone: 'danger'
        });
        if (!ok) return;
        startTransition(async () => {
          try {
            await deleteQuoteItemAction(itemId, quoteId, caseId);
            toast.success('Item removido');
          } catch (e) {
            toast.error('Erro', { description: (e as Error).message });
          }
        });
      }}
      className="inline-flex h-6 w-6 items-center justify-center rounded text-white/40 hover:bg-rose-400/10 hover:text-rose-300 disabled:opacity-40"
      title="Remover item"
    >
      <Trash2 className="h-3 w-3" strokeWidth={1.5} />
    </button>
  );
}

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusPill(status: string) {
  const base = 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.28em]';
  switch (status) {
    case 'draft': return `${base} border-white/15 bg-white/[0.03] text-white/60`;
    case 'sent': return `${base} border-sky-400/30 bg-sky-400/10 text-sky-200`;
    case 'approved': return `${base} border-emerald-400/30 bg-emerald-400/10 text-emerald-200`;
    case 'rejected': return `${base} border-rose-400/30 bg-rose-400/10 text-rose-200`;
    case 'changes_requested': return `${base} border-amber-400/30 bg-amber-400/10 text-amber-200`;
    case 'expired': return `${base} border-white/10 bg-white/[0.02] text-white/40`;
    default: return `${base} border-white/15 bg-white/[0.03] text-white/60`;
  }
}
