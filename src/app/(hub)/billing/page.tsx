import type { Metadata } from 'next';
import { listPlans } from '@/features/platform/queries';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BillingPanel } from './BillingPanel';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Assinatura · SR HUB' };

export default async function BillingPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string }>();

  const [{ data: org }, { data: sub }, plans] = await Promise.all([
    supabase
      .from('organizations')
      .select('name, subscription_status, trial_ends_at, plan:plans(code, name, monthly_price, yearly_price)')
      .eq('id', profile?.organization_id ?? '')
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('id, status, billing_cycle, trial_ends_at, current_period_end, cancel_at_period_end')
      .eq('organization_id', profile?.organization_id ?? '')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    listPlans()
  ]);

  const orgRow = org as unknown as {
    name: string;
    subscription_status: string;
    trial_ends_at: string | null;
    plan: { code: string; name: string; monthly_price: number; yearly_price: number } | null;
  } | null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Conta</div>
        <h1 className="mt-1 font-display text-3xl text-white md:text-4xl">Assinatura</h1>
      </header>

      <section className="rounded-3xl border border-gold/15 bg-gradient-to-b from-gold/[0.04] to-transparent p-6">
        <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">Plano atual</div>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <div className="font-display text-2xl text-white">{orgRow?.plan?.name ?? 'Sem plano'}</div>
            <div className="mt-1 text-xs text-white/60">
              Status: <span className="text-white">{orgRow?.subscription_status ?? 'sem assinatura'}</span>
              {orgRow?.trial_ends_at && ` · trial até ${new Date(orgRow.trial_ends_at).toLocaleDateString('pt-BR')}`}
            </div>
          </div>
          {orgRow?.plan?.monthly_price ? (
            <div className="font-display text-2xl text-gold-100">
              {orgRow.plan.monthly_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              <span className="text-xs text-white/40"> /mês</span>
            </div>
          ) : null}
        </div>
      </section>

      <BillingPanel plans={plans} currentPlanCode={orgRow?.plan?.code ?? null} />
    </div>
  );
}
