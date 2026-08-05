import type { Metadata } from 'next';
import { ENTITIES } from '@/lib/import/entities';
import { ImportWizard } from './ImportWizard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Nova importação · SR HUB' };

export default function NovoImportPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Configurações · Importação</div>
        <h1 className="mt-1 font-display text-3xl text-white md:text-4xl">Nova importação CSV</h1>
        <p className="mt-2 text-sm text-white/60">
          Selecione a entidade, cole o CSV ou anexe o arquivo. Execute o dry-run antes de aplicar.
        </p>
      </header>
      <ImportWizard entities={Object.values(ENTITIES).map((e) => ({ key: e.key, label: e.label }))} />
    </div>
  );
}
