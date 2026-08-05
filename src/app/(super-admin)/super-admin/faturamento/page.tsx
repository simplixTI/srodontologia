import type { Metadata } from 'next';
import { listInvoices } from '@/features/platform/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Faturamento · SR Platform' };

export default async function FaturamentoPage() {
  const invoices = await listInvoices();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <h1 className="font-display text-3xl text-white md:text-4xl">Faturamento</h1>
      </header>
      <div className="overflow-x-auto rounded-2xl border border-gold/10 bg-white/[0.02]">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/40 text-[0.55rem] uppercase tracking-[0.28em] text-white/50">
            <tr>
              <th className="px-4 py-3">Nº</th>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Pago em</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-xs text-white/40">
                  Nenhuma fatura emitida.
                </td>
              </tr>
            )}
            {invoices.map((i) => {
              const row = i as unknown as {
                id: string;
                invoice_number: string | null;
                total: number;
                currency: string;
                status: string;
                due_date: string | null;
                paid_at: string | null;
                organization: { name: string } | null;
              };
              return (
                <tr key={row.id} className="border-t border-white/5">
                  <td className="px-4 py-3 text-white">{row.invoice_number ?? '—'}</td>
                  <td className="px-4 py-3 text-white/80">{row.organization?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-white">
                    {Number(row.total).toLocaleString('pt-BR', { style: 'currency', currency: row.currency })}
                  </td>
                  <td className="px-4 py-3 text-white/80">{row.status}</td>
                  <td className="px-4 py-3 text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
                    {row.due_date ? new Date(row.due_date).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
                    {row.paid_at ? new Date(row.paid_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
