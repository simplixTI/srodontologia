import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, MapPinned } from 'lucide-react';
import { listDrivers, listRoutes } from '@/features/deliveries-v2/queries';
import { RoutesPanel } from './RoutesPanel';

export const metadata: Metadata = { title: 'Rotas · SR HUB' };
export const dynamic = 'force-dynamic';

export default async function RotasPage() {
  const [routes, drivers] = await Promise.all([listRoutes(), listDrivers()]);
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <header>
        <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">Rotas de entrega</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/60">
          Organize regiões atendidas em rotas para atribuir motorista responsável.
        </p>
      </header>
      <RoutesPanel initialRoutes={routes} drivers={drivers} />
    </div>
  );
}
