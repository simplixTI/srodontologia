import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { listRecentImports } from '@/features/import/queries';
import { ENTITIES } from '@/lib/import/entities';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Importações · SR HUB' };

export default async function ImportsPage() {
  const imports = await listRecentImports(30);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header className="flex flex-col gap-1">
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Configurações</div>
        <h1 className="font-display text-3xl text-white md:text-4xl">Importações CSV</h1>
        <p className="text-sm text-white/60">
          Suba planilhas para popular clínicas, dentistas, pacientes e casos. Sempre execute o dry-run primeiro.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-xs uppercase tracking-[0.28em] text-white/60">Baixar template</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {Object.values(ENTITIES).map((e) => (
            <a
              key={e.key}
              href={`/api/import/template?entity=${e.key}`}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/80 hover:border-gold/40 hover:text-white"
              download
            >
              {e.label}
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-[0.28em] text-white/60">Importações recentes</h2>
          <Link
            href="/configuracoes/importacoes/novo"
            className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70"
          >
            Nova importação
          </Link>
        </div>

        {imports.length === 0 ? (
          <p className="mt-4 text-sm text-white/40">Nenhuma importação ainda.</p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-white/5">
            {imports.map((imp) => (
              <li key={imp.id} className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3">
                  <StatusIcon status={imp.status} />
                  <div>
                    <div className="text-white">{ENTITIES[imp.entity as keyof typeof ENTITIES]?.label ?? imp.entity}</div>
                    <div className="text-[0.65rem] uppercase tracking-[0.22em] text-white/40">
                      {imp.dry_run ? 'DRY-RUN' : 'APPLY'} · {new Date(imp.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-white/60">
                  <div>Total: {imp.row_count ?? '—'}</div>
                  <div className="text-emerald-300">OK {imp.rows_ok}</div>
                  {imp.rows_error > 0 && <div className="text-red-300">Erros {imp.rows_error}</div>}
                  {imp.rows_duplicate > 0 && <div className="text-amber-300">Dup {imp.rows_duplicate}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-emerald-300" strokeWidth={1.5} />;
  if (status === 'failed') return <XCircle className="h-4 w-4 text-red-300" strokeWidth={1.5} />;
  return <Clock className="h-4 w-4 text-white/40" strokeWidth={1.5} />;
}
