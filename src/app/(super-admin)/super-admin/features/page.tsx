import type { Metadata } from 'next';
import { listFeatureFlagsWithOverrides } from '@/features/platform/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Feature Flags · SR Platform' };

export default async function FeaturesPage() {
  const flags = await listFeatureFlagsWithOverrides();
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <h1 className="font-display text-3xl text-white md:text-4xl">Feature Flags</h1>
        <p className="mt-2 text-sm text-white/60">
          Cascata de resolução: usuário &gt; role &gt; tenant &gt; plano &gt; default.
        </p>
      </header>
      <ul className="flex flex-col gap-3">
        {flags.map((f) => (
          <li key={f.key} className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/40">
                  {f.category ?? 'geral'}
                </div>
                <div className="mt-1 font-mono text-sm text-white">{f.key}</div>
                <p className="mt-1 text-xs text-white/60">{f.description}</p>
              </div>
              <span
                className={
                  f.default_enabled
                    ? 'rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-emerald-200'
                    : 'rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-white/60'
                }
              >
                default: {f.default_enabled ? 'on' : 'off'}
              </span>
            </div>
            {f.overrides.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {f.overrides.map((o, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-white/70"
                  >
                    {o.target_type}={o.target_id.slice(0, 8)}… → {o.enabled ? 'on' : 'off'}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
