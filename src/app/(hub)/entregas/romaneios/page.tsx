import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Package } from 'lucide-react';
import { listManifests } from '@/features/deliveries-v2/queries';
import { MANIFEST_STATUS_COLORS, MANIFEST_STATUS_LABELS } from '@/features/deliveries-v2/types';
import { CreateManifestButton } from './CreateManifestButton';

export const metadata: Metadata = { title: 'Romaneios · SR HUB' };
export const dynamic = 'force-dynamic';

export default async function RomaneiosPage() {
  const manifests = await listManifests();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Entregas · Romaneios
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">Romaneios</h1>
            <p className="mt-3 max-w-2xl text-white/60">
              Agrupamento de entregas por rota/motorista com QR code para tracking. Total:{' '}
              <strong className="text-white">{manifests.length}</strong>.
            </p>
          </div>
          <CreateManifestButton />
        </div>
      </header>

      {manifests.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-gold/10 bg-white/[0.02] p-14 text-center">
          <Package className="h-6 w-6 text-gold-300" strokeWidth={1.5} />
          <h2 className="mt-4 font-display text-2xl text-white">Nenhum romaneio</h2>
          <p className="mt-3 text-sm text-white/60">Crie um romaneio para agrupar entregas.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {manifests.map((m) => (
            <li key={m.id} className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5 hover:border-gold/30">
              <Link href={`/entregas/romaneios/${m.id}`} className="block">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm text-white">{m.code}</div>
                    <div className="mt-1 text-[0.65rem] text-white/60">
                      {m.item_count} entrega{m.item_count === 1 ? '' : 's'}
                      {m.route_name && ` · ${m.route_name}`}
                      {m.driver_name && ` · ${m.driver_name}`}
                    </div>
                  </div>
                  <span
                    className={
                      'shrink-0 rounded-full border px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.2em] ' +
                      MANIFEST_STATUS_COLORS[m.status]
                    }
                  >
                    {MANIFEST_STATUS_LABELS[m.status]}
                  </span>
                </div>
                <div className="mt-3 text-[0.6rem] text-white/40">
                  Criado em {new Date(m.created_at).toLocaleDateString('pt-BR')}
                  {m.dispatched_at && (
                    <> · Despacho {new Date(m.dispatched_at).toLocaleDateString('pt-BR')}</>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
