import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, UserRound } from 'lucide-react';
import { listDrivers } from '@/features/deliveries-v2/queries';
import { DRIVER_STATUS_LABELS } from '@/features/deliveries-v2/types';

export const metadata: Metadata = { title: 'Motoristas · SR HUB' };
export const dynamic = 'force-dynamic';

export default async function MotoristasPage() {
  const drivers = await listDrivers();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">Motoristas</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Cadastre os motoristas que operam as rotas de entrega.
          </p>
        </div>
        <Link
          href="/entregas/motoristas/novo"
          className="btn-gold inline-flex h-11 items-center gap-2 rounded-full px-5 text-[0.68rem] uppercase tracking-[0.22em]"
        >
          <Plus className="h-4 w-4" strokeWidth={2} /> Novo motorista
        </Link>
      </header>

      {drivers.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-gold/10 bg-white/[0.02] p-14 text-center">
          <UserRound className="h-6 w-6 text-gold-300" strokeWidth={1.5} />
          <h2 className="mt-4 font-display text-2xl text-white">Nenhum motorista</h2>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {drivers.map((d) => (
            <li key={d.id} className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-lg text-white">{d.full_name}</div>
                  <div className="mt-1 text-xs text-white/60">
                    {d.vehicle_plate && <>Placa {d.vehicle_plate}</>}
                    {d.vehicle_model && <> · {d.vehicle_model}</>}
                  </div>
                  {d.phone && <div className="mt-0.5 text-[0.65rem] text-white/50">Tel: {d.phone}</div>}
                </div>
                <span
                  className={
                    'shrink-0 rounded-full border px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.2em] ' +
                    (d.status === 'active'
                      ? 'border-emerald-400/40 text-emerald-200'
                      : 'border-white/20 text-white/40')
                  }
                >
                  {DRIVER_STATUS_LABELS[d.status]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
