import type { Metadata } from 'next';
import { listPlans } from '@/features/platform/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Planos · SR Platform' };

export default async function PlanosPage() {
  const plans = await listPlans();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Plataforma</div>
        <h1 className="mt-1 font-display text-3xl text-white md:text-4xl">Planos</h1>
      </header>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => (
          <li key={p.id} className="rounded-2xl border border-gold/15 bg-white/[0.02] p-5">
            <div className="text-[0.55rem] uppercase tracking-[0.28em] text-gold-100">{p.code}</div>
            <h3 className="mt-1 font-display text-xl text-white">{p.name}</h3>
            <p className="mt-1 min-h-[2.5em] text-xs text-white/60">{p.description}</p>

            <div className="mt-4">
              <div className="text-2xl text-white">
                {p.monthly_price > 0 ? formatBRL(p.monthly_price) : 'Sob consulta'}
                <span className="text-xs text-white/40"> /mês</span>
              </div>
              {p.yearly_price > 0 && (
                <div className="text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
                  {formatBRL(p.yearly_price)}/ano
                </div>
              )}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2 text-[0.65rem] text-white/70">
              <Limit label="Usuários" value={p.max_users} />
              <Limit label="Clínicas" value={p.max_clinics} />
              <Limit label="Dentistas" value={p.max_dentists} />
              <Limit label="Casos/mês" value={p.max_cases_month} />
              <Limit label="Storage" value={p.max_storage_gb} suffix="GB" />
              <Limit label="OCR/mês" value={p.max_ocr_month} />
              <Limit label="IA/mês" value={p.max_ai_tokens_month} suffix="tk" />
              <Limit label="API/mês" value={p.max_api_calls_month} />
              <Limit label="Automações" value={p.max_automations} />
              <Limit label="Webhooks" value={p.max_webhooks} />
            </dl>

            <ul className="mt-4 space-y-1 text-[0.65rem] text-white/60">
              {Object.entries(p.features)
                .filter(([, v]) => v)
                .map(([k]) => (
                  <li key={k}>· {k}</li>
                ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Limit({ label, value, suffix }: { label: string; value: number | null; suffix?: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-white/50">{label}</dt>
      <dd className="text-white">{value === null ? '∞' : `${value.toLocaleString('pt-BR')}${suffix ?? ''}`}</dd>
    </div>
  );
}

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
