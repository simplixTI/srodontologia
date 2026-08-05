import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getTenant, listPlans } from '@/features/platform/queries';
import { TenantActions } from './TenantActions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tenant · SR Platform' };

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const [tenant, plans] = await Promise.all([getTenant(params.id), listPlans()]);
  if (!tenant) notFound();

  const t = tenant as unknown as {
    id: string;
    name: string;
    legal_name: string | null;
    document: string | null;
    email: string | null;
    slug: string | null;
    subscription_status: string;
    trial_ends_at: string | null;
    suspended_at: string | null;
    suspended_reason: string | null;
    custom_domain: string | null;
    created_at: string;
    plan: { id: string; name: string; code: string; monthly_price: number; yearly_price: number } | null;
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <Link
        href="/super-admin/tenants"
        className="inline-flex items-center gap-1 text-[0.6rem] uppercase tracking-[0.28em] text-white/50 hover:text-white"
      >
        <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
        Voltar
      </Link>

      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Tenant</div>
        <h1 className="mt-1 font-display text-3xl text-white md:text-4xl">{t.name}</h1>
        <div className="mt-2 text-sm text-white/60">
          {t.legal_name ?? '—'} · {t.document ?? '—'} · {t.email ?? '—'}
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        <Field label="Slug" value={t.slug ?? '—'} />
        <Field label="Status da assinatura" value={t.subscription_status} />
        <Field label="Plano atual" value={t.plan?.name ?? '—'} />
        <Field label="Domínio custom" value={t.custom_domain ?? '—'} />
        <Field
          label="Trial termina em"
          value={t.trial_ends_at ? new Date(t.trial_ends_at).toLocaleString('pt-BR') : '—'}
        />
        <Field
          label="Suspenso em"
          value={t.suspended_at ? new Date(t.suspended_at).toLocaleString('pt-BR') : '—'}
        />
      </section>

      <TenantActions tenantId={t.id} currentPlanId={t.plan?.id ?? null} plans={plans} status={t.subscription_status} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">{label}</div>
      <div className="mt-1 text-sm text-white">{value}</div>
    </div>
  );
}
