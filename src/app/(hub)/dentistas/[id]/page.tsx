import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, UserCircle2, Mail, Phone, MessageCircle, MapPin, Building2, Instagram, Trash2, type LucideIcon } from 'lucide-react';
import { getDentist, listClinicsForSelect, listInternalStaff } from '@/features/dentists/queries';
import { updateDentistAction, archiveDentistAction } from '@/features/dentists/actions';
import { DentistForm } from '../DentistForm';
import { CUSTOMER_STATUS_LABELS, type CustomerStatus } from '@/lib/validations/dentists';
import { statusColor } from '@/components/hub/crm/statusColors';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params
}: {
  params: { id: string };
}): Promise<Metadata> {
  const d = await getDentist(params.id);
  return { title: d ? `${d.full_name} · Dentistas · SR HUB` : 'Dentista · SR HUB' };
}

export default async function DentistDetailPage({
  params
}: {
  params: { id: string };
}) {
  const [dentist, clinics, staff] = await Promise.all([
    getDentist(params.id),
    listClinicsForSelect(),
    listInternalStaff()
  ]);
  if (!dentist) notFound();

  const boundUpdate = updateDentistAction.bind(null, params.id);
  const boundArchive = archiveDentistAction.bind(null, params.id);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10 md:px-10">
      <Link
        href="/dentistas"
        className="group inline-flex items-center gap-2 self-start text-[0.65rem] uppercase tracking-[0.32em] text-white/60 transition hover:text-gold-100"
      >
        <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
        Todos os dentistas
      </Link>

      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Dentista
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
          <span className={statusColor(dentist.customer_status as CustomerStatus)}>
            {CUSTOMER_STATUS_LABELS[dentist.customer_status as CustomerStatus] ?? dentist.customer_status}
          </span>
        </div>

        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-full border border-gold/20 bg-black/40">
            <UserCircle2 className="h-6 w-6 text-gold-100" strokeWidth={1.4} />
          </div>
          <div>
            <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
              {dentist.full_name}
            </h1>
            <p className="mt-1 text-white/50">
              {[dentist.cro_state, dentist.cro_number].filter(Boolean).join('-') || 'CRO —'}
              {dentist.specialty ? ` · ${dentist.specialty}` : ''}
            </p>
          </div>
        </div>
      </header>

      {/* Quick facts (360° view — data only, no fake metrics) */}
      <section className="grid gap-3 md:grid-cols-3">
        {dentist.primary_clinic && (
          <FactCard icon={Building2} label="Clínica primária" href={`/clinicas/${dentist.primary_clinic.id}`}>
            {dentist.primary_clinic.trade_name}
          </FactCard>
        )}
        {(dentist.city || dentist.state) && (
          <FactCard icon={MapPin} label="Localização">
            {[dentist.city, dentist.state].filter(Boolean).join(' · ')}
          </FactCard>
        )}
        {dentist.commercial_owner && (
          <FactCard icon={UserCircle2} label="Consultor">
            {dentist.commercial_owner.full_name}
          </FactCard>
        )}
        {dentist.email && (
          <FactCard icon={Mail} label="E-mail">{dentist.email}</FactCard>
        )}
        {dentist.phone && (
          <FactCard icon={Phone} label="Telefone">{dentist.phone}</FactCard>
        )}
        {dentist.whatsapp && (
          <FactCard icon={MessageCircle} label="WhatsApp">{dentist.whatsapp}</FactCard>
        )}
        {dentist.instagram && (
          <FactCard icon={Instagram} label="Instagram">@{dentist.instagram}</FactCard>
        )}
      </section>

      {/* 360° tabs stub — cases/quotes/finance will populate in Tranche 3-5 */}
      <section className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-6">
        <div className="text-[0.55rem] uppercase tracking-[0.32em] text-white/40">
          Visão 360º
        </div>
        <p className="mt-2 text-sm text-white/60">
          Casos, orçamentos, entregas e histórico comercial aparecerão aqui
          conforme forem sendo criados. Nenhum dado até o momento.
        </p>
      </section>

      {/* Edit form */}
      <section>
        <h2 className="font-display text-2xl text-white">Editar dados</h2>
        <div className="mt-4 rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-8">
          <DentistForm
            action={boundUpdate}
            dentist={dentist}
            clinics={clinics}
            staff={staff}
            submitLabel="Salvar alterações"
          />
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-3xl border border-rose-400/20 bg-rose-400/5 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[0.55rem] uppercase tracking-[0.3em] text-rose-200/80">Danger zone</div>
            <h3 className="mt-1 font-display text-lg text-white">Arquivar dentista</h3>
            <p className="text-xs text-white/50">
              Arquivamento lógico. Casos históricos permanecem preservados.
            </p>
          </div>
          <form
            action={async () => {
              'use server';
              await boundArchive();
            }}
          >
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-rose-400/40 px-5 text-[0.6rem] uppercase tracking-[0.3em] text-rose-200 transition hover:bg-rose-400/10"
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
              Arquivar
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function FactCard({
  icon: Icon,
  label,
  href,
  children
}: {
  icon: LucideIcon;
  label: string;
  href?: string;
  children: React.ReactNode;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-2 text-[0.55rem] uppercase tracking-[0.32em] text-white/40">
        <Icon className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
        {label}
      </div>
      <div className="mt-2 text-sm text-white">{children}</div>
    </>
  );
  const cls = 'block rounded-2xl border border-gold/10 bg-white/[0.02] p-4 transition';
  if (href)
    return (
      <Link href={href} className={`${cls} hover:border-gold/30`}>
        {inner}
      </Link>
    );
  return <div className={cls}>{inner}</div>;
}
