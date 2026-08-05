import type { Metadata } from 'next';
import Link from 'next/link';
import { getMyDentistRecord } from '@/features/portal/queries';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Perfil · Portal SR Digital'
};

export default async function PortalPerfilPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [me, profileRow] = await Promise.all([
    getMyDentistRecord(),
    supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', user?.id ?? '')
      .maybeSingle<{ full_name: string; email: string; phone: string | null }>()
  ]);

  const profile = profileRow.data;

  let clinic: { trade_name: string; city: string | null; state: string | null } | null = null;
  if (me?.primary_clinic_id) {
    const { data } = await supabase
      .from('clinics')
      .select('trade_name, city, state')
      .eq('id', me.primary_clinic_id)
      .maybeSingle<{ trade_name: string; city: string | null; state: string | null }>();
    clinic = data;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
          Meu perfil
        </div>
        <h1 className="mt-1 font-display text-2xl text-white md:text-3xl">
          Seus dados profissionais
        </h1>
      </header>

      <section className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-6">
        <h2 className="text-[0.6rem] uppercase tracking-[0.3em] text-white/50">Dentista</h2>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <Field label="Nome" value={me?.full_name ?? profile?.full_name ?? '—'} />
          <Field label="E-mail" value={profile?.email ?? '—'} />
          <Field label="Telefone" value={profile?.phone ?? '—'} />
          <Field
            label="CRO"
            value={
              me?.cro_number ? `${me.cro_number} · ${me.cro_state ?? '—'}` : '—'
            }
          />
        </dl>
      </section>

      <section className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-6">
        <h2 className="text-[0.6rem] uppercase tracking-[0.3em] text-white/50">Clínica principal</h2>
        {clinic ? (
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <Field label="Nome" value={clinic.trade_name} />
            <Field
              label="Localização"
              value={
                [clinic.city, clinic.state].filter(Boolean).join(' · ') || '—'
              }
            />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-white/50">Nenhuma clínica vinculada.</p>
        )}
      </section>

      <section className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-6">
        <h2 className="text-[0.6rem] uppercase tracking-[0.3em] text-white/50">Segurança</h2>
        <div className="mt-3 flex flex-col gap-3">
          <Link
            href="/change-password"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-gold/30 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/60 hover:bg-gold/5"
          >
            Alterar senha
          </Link>
        </div>
      </section>

      <p className="text-center text-xs text-white/40">
        Para atualizar seus dados, entre em contato com o laboratório.
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.55rem] uppercase tracking-[0.25em] text-white/40">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-white">{value}</dd>
    </div>
  );
}
