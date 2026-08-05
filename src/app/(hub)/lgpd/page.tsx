import type { Metadata } from 'next';
import { listExportRequests, listDeletionRequests } from '@/features/lgpd/queries';
import { LgpdPanel } from './LgpdPanel';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'LGPD · SR HUB' };

export default async function LgpdPage() {
  const [exports, deletions] = await Promise.all([listExportRequests(), listDeletionRequests()]);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Conta</div>
        <h1 className="mt-1 font-display text-3xl text-white md:text-4xl">LGPD & Privacidade</h1>
        <p className="mt-2 text-sm text-white/60">
          Direitos garantidos pela LGPD: exportação e exclusão dos seus dados. Exclusões são
          agendadas para 30 dias após a solicitação e podem ser canceladas nesse período.
        </p>
      </header>
      <LgpdPanel exports={exports} deletions={deletions} />
    </div>
  );
}
