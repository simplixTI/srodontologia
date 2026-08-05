import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, QrCode } from 'lucide-react';
import {
  getManifest,
  listManifestDeliveries,
  listPendingDeliveriesForManifest
} from '@/features/deliveries-v2/queries';
import { MANIFEST_STATUS_COLORS, MANIFEST_STATUS_LABELS } from '@/features/deliveries-v2/types';
import { ManifestPanel } from './ManifestPanel';

export const metadata: Metadata = { title: 'Romaneio · SR HUB' };
export const dynamic = 'force-dynamic';

export default async function ManifestPage({ params }: { params: { manifestId: string } }) {
  const [manifest, items, pending] = await Promise.all([
    getManifest(params.manifestId),
    listManifestDeliveries(params.manifestId),
    listPendingDeliveriesForManifest()
  ]);
  if (!manifest) notFound();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/entregas/romaneios"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>

      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 font-mono text-3xl text-white">
            <QrCode className="h-6 w-6 text-gold-200" strokeWidth={1.5} />
            {manifest.code}
          </h1>
          <div className="mt-1 text-sm text-white/60">
            Criado em {new Date(manifest.created_at).toLocaleString('pt-BR')}
          </div>
        </div>
        <span
          className={
            'rounded-full border px-3 py-1 text-[0.6rem] uppercase tracking-[0.22em] ' +
            MANIFEST_STATUS_COLORS[manifest.status]
          }
        >
          {MANIFEST_STATUS_LABELS[manifest.status]}
        </span>
      </header>

      <ManifestPanel manifest={manifest} initialItems={items} pendingDeliveries={pending} />
    </div>
  );
}
