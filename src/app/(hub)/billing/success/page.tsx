import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function BillingSuccessPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-16 text-center">
      <CheckCircle2 className="h-16 w-16 text-emerald-300" strokeWidth={1.5} />
      <h1 className="font-display text-3xl text-white">Pagamento confirmado</h1>
      <p className="text-sm text-white/60">
        Sua assinatura foi ativada. O acesso aos recursos do plano já está liberado.
      </p>
      <Link
        href="/dashboard"
        className="rounded-full border border-gold/40 bg-gold/10 px-6 py-3 text-[0.65rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70"
      >
        Ir para o dashboard
      </Link>
    </div>
  );
}
