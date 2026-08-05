'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import {
  addDeliveryToManifestAction,
  removeDeliveryFromManifestAction,
  transitionManifestAction
} from '@/features/deliveries-v2/actions';
import type { Manifest } from '@/features/deliveries-v2/types';

type ManifestItemRow = {
  id: string;
  delivery_id: string;
  position: number;
  status: string;
  case_number: string | null;
  case_title: string | null;
  patient_initials: string | null;
  destination_address: string | null;
};

type Pending = {
  id: string;
  case_number: string | null;
  case_title: string | null;
  destination_address: string | null;
  status: string;
};

type Props = {
  manifest: Manifest;
  initialItems: ManifestItemRow[];
  pendingDeliveries: Pending[];
};

const TRANSITIONS: Array<{ target: 'ready' | 'dispatched' | 'in_transit' | 'completed' | 'cancelled'; label: string; from: string[] }> = [
  { target: 'ready', label: 'Marcar pronto', from: ['draft'] },
  { target: 'dispatched', label: 'Despachar', from: ['ready'] },
  { target: 'in_transit', label: 'Em trânsito', from: ['dispatched'] },
  { target: 'completed', label: 'Concluir', from: ['in_transit', 'dispatched'] },
  { target: 'cancelled', label: 'Cancelar', from: ['draft', 'ready'] }
];

export function ManifestPanel({ manifest, initialItems, pendingDeliveries }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ManifestItemRow[]>(initialItems);
  const [selected, setSelected] = useState('');
  const [pending, startTransition] = useTransition();

  const trackingUrl = manifest.qr_token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/rastreio/${manifest.qr_token}`
    : '';

  function addDelivery() {
    if (!selected) return;
    startTransition(async () => {
      try {
        await addDeliveryToManifestAction({
          manifest_id: manifest.id,
          delivery_id: selected
        });
        setSelected('');
        toast.success('Entrega adicionada');
        router.refresh();
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  function removeItem(itemId: string) {
    if (!confirm('Remover esta entrega do romaneio?')) return;
    startTransition(async () => {
      try {
        await removeDeliveryFromManifestAction(itemId, manifest.id);
        setItems((s) => s.filter((x) => x.id !== itemId));
        toast.success('Removido');
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  function transition(target: 'ready' | 'dispatched' | 'in_transit' | 'completed' | 'cancelled') {
    startTransition(async () => {
      try {
        await transitionManifestAction({ manifest_id: manifest.id, target });
        toast.success('Status atualizado');
        router.refresh();
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
        <h2 className="mb-3 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">
          Entregas ({items.length})
        </h2>
        {items.length === 0 ? (
          <div className="mb-4 text-sm text-white/40">Nenhuma entrega vinculada.</div>
        ) : (
          <ol className="mb-4 space-y-1">
            {items.map((i, idx) => (
              <li
                key={i.id}
                className="flex items-start gap-3 rounded-xl border border-gold/5 bg-black/20 px-3 py-2"
              >
                <span className="mt-0.5 font-mono text-[0.55rem] text-white/40">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white">
                    {i.case_number ?? 'Caso'} — {i.case_title ?? 'Sem título'}
                  </div>
                  <div className="text-[0.6rem] text-white/40">
                    {i.destination_address ?? 'sem endereço'} · Status: {i.status}
                    {i.patient_initials && <> · Paciente {i.patient_initials}</>}
                  </div>
                </div>
                {manifest.status === 'draft' && (
                  <button
                    type="button"
                    onClick={() => removeItem(i.id)}
                    className="text-red-300/60 hover:text-red-300"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}

        {manifest.status === 'draft' && (
          <div className="flex items-end gap-2 border-t border-white/5 pt-4">
            <div className="flex flex-1 flex-col gap-1 text-xs text-white/60">
              Adicionar entrega
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="input-dark h-9 rounded-xl px-3 text-sm"
              >
                <option value="">Selecione</option>
                {pendingDeliveries.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.case_number ?? '—'} — {p.case_title ?? '—'} · {p.destination_address ?? 'sem endereço'}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={addDelivery}
              disabled={pending || !selected}
              className="btn-gold inline-flex h-9 items-center gap-2 rounded-full px-4 text-[0.65rem] uppercase tracking-[0.22em]"
            >
              <Plus className="h-3 w-3" strokeWidth={2} /> Incluir
            </button>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
          <h2 className="mb-3 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">Status</h2>
          <div className="flex flex-wrap gap-2">
            {TRANSITIONS.map((t) => {
              const allowed = t.from.includes(manifest.status);
              return (
                <button
                  key={t.target}
                  type="button"
                  disabled={pending || !allowed}
                  onClick={() => transition(t.target)}
                  className={
                    'h-9 rounded-full border px-4 text-[0.6rem] uppercase tracking-[0.22em] transition disabled:opacity-30 ' +
                    (t.target === 'cancelled'
                      ? 'border-red-400/40 text-red-200 hover:bg-red-400/10'
                      : 'border-gold/30 text-gold-100 hover:bg-gold/10')
                  }
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
          <h2 className="mb-3 flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">
            <QrCode className="h-3.5 w-3.5" strokeWidth={1.5} /> QR / tracking
          </h2>
          {manifest.qr_token ? (
            <div className="space-y-2">
              <div className="rounded-xl border border-gold/5 bg-black/40 px-3 py-2 font-mono text-[0.6rem] break-all text-white/70">
                {manifest.qr_token}
              </div>
              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-xs text-gold-100 hover:underline"
                >
                  {trackingUrl}
                </a>
              )}
              <p className="text-[0.6rem] text-white/40">
                Compartilhe este link com o dentista para acompanhar o status da entrega.
              </p>
            </div>
          ) : (
            <div className="text-sm text-white/40">Sem QR token disponível.</div>
          )}
        </div>
      </section>
    </div>
  );
}
