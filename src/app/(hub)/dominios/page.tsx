import type { Metadata } from 'next';
import { listDomains } from '@/features/domains/queries';
import { DomainsPanel } from './DomainsPanel';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Domínio próprio · SR HUB' };

export default async function DomainsPage() {
  const domains = await listDomains();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">SaaS</div>
        <h1 className="mt-1 font-display text-3xl text-white md:text-4xl">Domínio próprio</h1>
        <p className="mt-2 text-sm text-white/60">
          Configure um domínio personalizado (ex.: <code>portal.suaempresa.com.br</code>) para o portal do dentista.
        </p>
      </header>
      <DomainsPanel initial={domains} />
    </div>
  );
}
