'use client';

import { useState, useTransition } from 'react';
import { Truck, Plus, ExternalLink, Copy } from 'lucide-react';
import type { Delivery, DeliveryStatus } from '@/features/deliveries/types';
import { DELIVERY_STATUS_LABELS } from '@/features/deliveries/types';
import { createDeliveryAction, updateDeliveryStatusAction } from '@/features/deliveries/actions';
import { Field, Input, Submit } from '@/components/ui/Field';

const STATUS_ORDER: DeliveryStatus[] = [
  'pending', 'preparing', 'ready_for_pickup', 'dispatched', 'in_transit', 'delivered', 'problem'
];

const statusColor: Record<DeliveryStatus, string> = {
  pending: 'border-white/15 bg-white/[0.02] text-white/60',
  preparing: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  ready_for_pickup: 'border-indigo-400/30 bg-indigo-400/10 text-indigo-200',
  dispatched: 'border-teal-400/30 bg-teal-400/10 text-teal-200',
  in_transit: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  delivered: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  problem: 'border-rose-400/30 bg-rose-400/10 text-rose-200'
};

export function DeliveriesTab({
  caseId,
  initialDeliveries
}: {
  caseId: string;
  initialDeliveries: Delivery[];
}) {
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [openForm, setOpenForm] = useState(deliveries.length === 0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const create = async (fd: FormData) => {
    setError(null);
    startTransition(async () => {
      const res = await createDeliveryAction(caseId, fd);
      if (!res.ok) {
        setError(res.error ?? 'Erro ao criar entrega.');
      } else {
        setOpenForm(false);
        window.location.reload();
      }
    });
  };

  const changeStatus = (deliveryId: string, newStatus: DeliveryStatus) => {
    setDeliveries((prev) => prev.map((d) => (d.id === deliveryId ? { ...d, status: newStatus } : d)));
    startTransition(async () => {
      try { await updateDeliveryStatusAction(deliveryId, caseId, newStatus); }
      catch (e) { alert('Erro: ' + (e as Error).message); }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl text-white">Entregas</h3>
          <p className="mt-1 text-xs text-white/50">
            {deliveries.length} entrega{deliveries.length !== 1 ? 's' : ''} · uma por caso normalmente
          </p>
        </div>
        {!openForm && (
          <button
            onClick={() => setOpenForm(true)}
            className="btn-gold inline-flex h-10 items-center gap-2 rounded-full px-5 text-[0.65rem] uppercase tracking-[0.24em]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Nova entrega
          </button>
        )}
      </div>

      {openForm && (
        <form action={create} className="rounded-2xl border border-gold/20 bg-white/[0.02] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-display text-lg text-white">Nova entrega</h4>
            <button
              type="button"
              onClick={() => setOpenForm(false)}
              className="text-[0.6rem] uppercase tracking-[0.28em] text-white/50 hover:text-gold-100"
            >
              cancelar
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Método" htmlFor="method">
              <Input id="method" name="method" placeholder="Sedex, Motoboy, Retirada..." />
            </Field>
            <Field label="Transportadora" htmlFor="carrier">
              <Input id="carrier" name="carrier" placeholder="Correios, JadLog..." />
            </Field>
            <Field label="Código de rastreio" htmlFor="tracking_code">
              <Input id="tracking_code" name="tracking_code" placeholder="BR1234567BR" />
            </Field>
            <Field label="URL de rastreio" htmlFor="tracking_url">
              <Input id="tracking_url" name="tracking_url" type="url" placeholder="https://..." />
            </Field>
            <Field label="Recebedor" htmlFor="recipient_name">
              <Input id="recipient_name" name="recipient_name" placeholder="Dr. Fulano" />
            </Field>
            <Field label="Previsão de entrega" htmlFor="estimated_delivery_at">
              <Input id="estimated_delivery_at" name="estimated_delivery_at" type="date" />
            </Field>
            <Field label="Status inicial" htmlFor="status">
              <select
                id="status"
                name="status"
                defaultValue="preparing"
                className="h-11 w-full rounded-xl border border-gold/15 bg-black/40 px-4 text-sm text-white focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s} className="bg-black">{DELIVERY_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </Field>
          </div>
          {error && (
            <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p>
          )}
          <div className="mt-4">
            <Submit pending={pending}>Criar entrega</Submit>
          </div>
        </form>
      )}

      {deliveries.length === 0 && !openForm && (
        <p className="rounded-2xl border border-gold/10 bg-white/[0.02] p-8 text-center text-sm text-white/50">
          Nenhuma entrega ainda.
        </p>
      )}

      {deliveries.map((d) => (
        <div key={d.id} className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/20 bg-black/40">
                <Truck className="h-4 w-4 text-gold-100" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-sm text-white">{d.method || 'Método não definido'}</div>
                <div className="text-[0.6rem] uppercase tracking-[0.25em] text-white/40">
                  {[d.carrier, d.recipient_name].filter(Boolean).join(' · ') || 'sem detalhes'}
                </div>
              </div>
            </div>

            <select
              value={d.status}
              onChange={(e) => changeStatus(d.id, e.target.value as DeliveryStatus)}
              disabled={pending}
              className={`h-8 rounded-full border px-3 text-[0.55rem] uppercase tracking-[0.28em] focus:outline-none ${statusColor[d.status]}`}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s} className="bg-black">{DELIVERY_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {d.tracking_code && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-gold/10 bg-black/40 px-3 py-2">
              <code className="flex-1 font-mono text-xs text-white">{d.tracking_code}</code>
              <button
                onClick={() => navigator.clipboard.writeText(d.tracking_code!)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white/60 hover:bg-white/5 hover:text-gold-100"
                title="Copiar código"
              >
                <Copy className="h-3 w-3" strokeWidth={1.5} />
              </button>
              {d.tracking_url && (
                <a
                  href={d.tracking_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[0.55rem] uppercase tracking-[0.25em] text-gold-100 hover:bg-white/5"
                >
                  Rastrear <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-x-4 text-[0.6rem] uppercase tracking-[0.25em] text-white/40">
            {d.estimated_delivery_at && (
              <span>Previsão: {new Date(d.estimated_delivery_at).toLocaleDateString('pt-BR')}</span>
            )}
            {d.shipped_at && <span>Enviado em: {new Date(d.shipped_at).toLocaleDateString('pt-BR')}</span>}
            {d.delivered_at && <span>Entregue em: {new Date(d.delivered_at).toLocaleDateString('pt-BR')}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
