import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { listCommissions } from '@/features/finance-v2/queries';
import { COMMISSION_STATUS_LABELS } from '@/features/finance-v2/types';
import { CommissionsList } from './CommissionsList';

export const metadata: Metadata = { title: 'Comissões · Financeiro' };
export const dynamic = 'force-dynamic';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function ComissoesPage() {
  const commissions = await listCommissions();
  const totalPending = commissions
    .filter((c) => c.status === 'pending' || c.status === 'approved')
    .reduce((acc, c) => acc + Number(c.amount ?? 0), 0);
  const totalPaid = commissions
    .filter((c) => c.status === 'paid')
    .reduce((acc, c) => acc + Number(c.amount ?? 0), 0);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/financeiro"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>
      <header>
        <h1 className="font-display text-3xl text-white md:text-4xl">Comissões</h1>
        <p className="mt-2 text-sm text-white/60">
          Comissões calculadas sobre casos ou faturas. Ao pagar, uma transação de despesa é registrada
          automaticamente.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KpiTile label="Total (todas)" value={fmt(totalPending + totalPaid)} />
        <KpiTile label="A pagar" value={fmt(totalPending)} tone="amber" />
        <KpiTile label="Paga" value={fmt(totalPaid)} tone="emerald" />
      </div>

      <CommissionsList initialCommissions={commissions} />

      <div className="text-[0.6rem] text-white/40">
        Status possíveis: {Object.values(COMMISSION_STATUS_LABELS).join(' · ')}.
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone?: 'amber' | 'emerald';
}) {
  const color = tone === 'amber' ? 'text-amber-200' : tone === 'emerald' ? 'text-emerald-200' : 'text-white';
  return (
    <div className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4">
      <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">{label}</div>
      <div className={`mt-2 font-display text-xl ${color}`}>{value}</div>
    </div>
  );
}
