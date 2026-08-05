import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getPayable } from '@/features/finance-v2/queries';
import {
  PAYABLE_STATUS_COLORS,
  PAYABLE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS
} from '@/features/finance-v2/types';
import { PayPanel } from './PayPanel';

export const metadata: Metadata = { title: 'Conta · Financeiro' };
export const dynamic = 'force-dynamic';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function PayablePage({ params }: { params: { payableId: string } }) {
  const p = await getPayable(params.payableId);
  if (!p) notFound();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/financeiro/pagar"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>

      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl text-white md:text-4xl">{p.supplier_name}</h1>
          <div className="mt-1 text-sm text-white/60">
            Vencimento {new Date(p.due_date).toLocaleDateString('pt-BR')}
            {p.category_name && ` · ${p.category_name}`}
            {p.cost_center_name && ` · CC ${p.cost_center_name}`}
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-4xl text-white">{fmt(Number(p.amount))}</div>
          <span
            className={
              'mt-2 inline-block rounded-full border px-3 py-1 text-[0.6rem] uppercase tracking-[0.22em] ' +
              PAYABLE_STATUS_COLORS[p.status]
            }
          >
            {PAYABLE_STATUS_LABELS[p.status]}
          </span>
        </div>
      </header>

      {p.description && (
        <section className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
          <h2 className="mb-2 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">Descrição</h2>
          <p className="whitespace-pre-wrap text-sm text-white/80">{p.description}</p>
        </section>
      )}

      {p.status !== 'paid' && p.status !== 'cancelled' ? (
        <PayPanel payableId={p.id} suggestedAmount={Number(p.amount)} />
      ) : (
        p.status === 'paid' && (
          <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.03] p-5">
            <h2 className="mb-2 text-[0.6rem] uppercase tracking-[0.32em] text-emerald-200">Pagamento</h2>
            <div className="text-sm text-white/80">
              {fmt(Number(p.paid_amount ?? 0))} via{' '}
              {p.method ? PAYMENT_METHOD_LABELS[p.method] : '—'} em{' '}
              {p.paid_at && new Date(p.paid_at).toLocaleString('pt-BR')}
            </div>
          </section>
        )
      )}

      {p.notes && (
        <section className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
          <h2 className="mb-2 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">Anotações</h2>
          <p className="whitespace-pre-wrap text-sm text-white/70">{p.notes}</p>
        </section>
      )}
    </div>
  );
}
