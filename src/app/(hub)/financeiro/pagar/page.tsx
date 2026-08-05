import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, ArrowLeft } from 'lucide-react';
import { listPayables } from '@/features/finance-v2/queries';
import { PAYABLE_STATUS_COLORS, PAYABLE_STATUS_LABELS } from '@/features/finance-v2/types';

export const metadata: Metadata = { title: 'Contas a pagar · SR HUB' };
export const dynamic = 'force-dynamic';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function PagarPage({
  searchParams
}: {
  searchParams?: { status?: string };
}) {
  const status = (searchParams?.status as
    | 'pending'
    | 'scheduled'
    | 'paid'
    | 'overdue'
    | 'cancelled'
    | undefined) ?? undefined;
  const payables = await listPayables(status ? { status } : undefined);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/financeiro"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl text-white md:text-4xl">Contas a pagar</h1>
          <p className="mt-2 text-sm text-white/60">
            {payables.length} conta{payables.length === 1 ? '' : 's'} listada{payables.length === 1 ? '' : 's'}.
          </p>
        </div>
        <Link
          href="/financeiro/pagar/novo"
          className="btn-gold inline-flex h-11 items-center gap-2 rounded-full px-5 text-[0.68rem] uppercase tracking-[0.22em]"
        >
          <Plus className="h-4 w-4" strokeWidth={2} /> Nova conta
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip label="Todas" href="/financeiro/pagar" active={!status} />
        {(['pending', 'scheduled', 'paid', 'overdue', 'cancelled'] as const).map((s) => (
          <FilterChip
            key={s}
            label={PAYABLE_STATUS_LABELS[s]}
            href={`/financeiro/pagar?status=${s}`}
            active={status === s}
          />
        ))}
      </div>

      {payables.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 p-14 text-center text-sm text-white/40">
          Nenhuma conta cadastrada.
        </div>
      ) : (
        <ul className="space-y-2">
          {payables.map((p) => {
            const overdue =
              new Date(p.due_date).getTime() < Date.now() && p.status !== 'paid' && p.status !== 'cancelled';
            return (
              <li key={p.id} className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4 hover:border-gold/30">
                <Link href={`/financeiro/pagar/${p.id}`} className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-white">{p.supplier_name}</div>
                    <div className="mt-0.5 text-[0.65rem] text-white/50">
                      Vence em {new Date(p.due_date).toLocaleDateString('pt-BR')}
                      {p.category_name && ` · ${p.category_name}`}
                      {p.cost_center_name && ` · CC ${p.cost_center_name}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg text-white">{fmt(Number(p.amount))}</div>
                    <span
                      className={
                        'mt-1 inline-block rounded-full border px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.2em] ' +
                        PAYABLE_STATUS_COLORS[overdue && p.status === 'pending' ? 'overdue' : p.status]
                      }
                    >
                      {PAYABLE_STATUS_LABELS[overdue && p.status === 'pending' ? 'overdue' : p.status]}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        'rounded-full border px-3 py-1 text-xs transition ' +
        (active ? 'border-gold/60 bg-gold/10 text-gold-100' : 'border-white/10 text-white/60 hover:border-white/30')
      }
    >
      {label}
    </Link>
  );
}
