import type { Metadata } from 'next';
import { collectConfigChecks } from '@/lib/ops/external-config-checks';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Config status · Super Admin' };

export default function ConfigStatusPage() {
  const checks = collectConfigChecks();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Super Admin</div>
        <h1 className="mt-1 font-display text-3xl text-white md:text-4xl">Status de configurações externas</h1>
        <p className="mt-2 text-sm text-white/60">
          Cada componente mostra apenas o status — os valores dos segredos nunca são exibidos.
        </p>
      </header>

      <ul className="flex flex-col divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.02]">
        {checks.map((c) => (
          <li key={c.component} className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-white">
                <Dot status={c.status} />
                <span className="capitalize">{c.component.replace(/_/g, ' ')}</span>
                {c.configured ? null : (
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.28em] text-white/50">
                    não configurado
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-white/50">{c.detail}</p>
            </div>
            <StatusBadge status={c.status} />
          </li>
        ))}
      </ul>

      <p className="text-xs text-white/40">
        Para uma verificação com hit real nos providers, rode <code>npm run validate:staging</code> localmente.
      </p>
    </div>
  );
}

function Dot({ status }: { status: string }) {
  const color =
    status === 'ok' ? 'bg-emerald-400' :
    status === 'warning' ? 'bg-amber-400' :
    status === 'error' ? 'bg-red-400' :
    'bg-white/30';
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

function StatusBadge({ status }: { status: string }) {
  const map = {
    ok:           { label: 'OK',            cls: 'border-emerald-400/30 text-emerald-300 bg-emerald-400/[0.06]' },
    warning:      { label: 'ATENÇÃO',       cls: 'border-amber-400/30 text-amber-300 bg-amber-400/[0.06]' },
    error:        { label: 'ERRO',          cls: 'border-red-400/30 text-red-300 bg-red-400/[0.06]' },
    unconfigured: { label: 'NÃO CONFIG.',   cls: 'border-white/10 text-white/50 bg-white/[0.02]' }
  } as const;
  const s = map[status as keyof typeof map] ?? map.unconfigured;
  return (
    <span className={`rounded-full border px-3 py-1 text-[0.55rem] uppercase tracking-[0.28em] ${s.cls}`}>
      {s.label}
    </span>
  );
}
