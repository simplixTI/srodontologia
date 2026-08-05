'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { payPayableAction } from '@/features/finance-v2/actions';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/features/finance-v2/types';

const METHODS: PaymentMethod[] = ['pix', 'boleto', 'credit_card', 'debit_card', 'bank_transfer', 'cash', 'other'];

export function PayPanel({ payableId, suggestedAmount }: { payableId: string; suggestedAmount: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(suggestedAmount));
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [notes, setNotes] = useState('');
  const [pending, startTransition] = useTransition();

  function pay() {
    const parsed = Number(amount.replace(',', '.'));
    if (!parsed || parsed <= 0) {
      toast.error('Valor inválido');
      return;
    }
    startTransition(async () => {
      try {
        await payPayableAction({
          payable_id: payableId,
          paid_amount: parsed,
          method,
          notes: notes || null
        });
        toast.success('Pagamento registrado');
        router.refresh();
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  return (
    <section className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
      <h2 className="mb-3 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">Registrar pagamento</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Valor pago (R$)
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input-dark h-10 rounded-xl px-3 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Método
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="input-dark h-10 rounded-xl px-3 text-sm"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 flex flex-col gap-1 text-xs text-white/60">
        Observações
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="input-dark rounded-xl px-3 py-2 text-sm"
        />
      </label>
      <button
        type="button"
        onClick={pay}
        disabled={pending}
        className="btn-gold mt-4 h-11 rounded-full px-6 text-[0.7rem] uppercase tracking-[0.22em]"
      >
        Confirmar pagamento
      </button>
    </section>
  );
}
