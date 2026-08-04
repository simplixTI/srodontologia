import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, MapPin, Mail, Phone, MessageCircle, Trash2, UserCircle2, type LucideIcon } from 'lucide-react';
import { getClinic, getClinicDentists } from '@/features/clinics/queries';
import { updateClinicAction, archiveClinicAction } from '@/features/clinics/actions';
import { ClinicForm } from '../ClinicForm';
import { CUSTOMER_STATUS_LABELS, type CustomerStatus } from '@/lib/validations/dentists';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params
}: {
  params: { id: string };
}): Promise<Metadata> {
  const c = await getClinic(params.id);
  return { title: c ? `${c.trade_name} · Clínicas · SR HUB` : 'Clínica · SR HUB' };
}

export default async function ClinicDetailPage({
  params
}: {
  params: { id: string };
}) {
  const clinic = await getClinic(params.id);
  if (!clinic) notFound();
  const links = await getClinicDentists(params.id);

  const boundUpdate = updateClinicAction.bind(null, params.id);
  const boundArchive = archiveClinicAction.bind(null, params.id);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10 md:px-10">
      <Link
        href="/clinicas"
        className="group inline-flex items-center gap-2 self-start text-[0.65rem] uppercase tracking-[0.32em] text-white/60 transition hover:text-gold-100"
      >
        <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
        Todas as clínicas
      </Link>

      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Clínica
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
          <span
            className={
              clinic.active
                ? 'inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.3em] text-emerald-200'
                : 'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.3em] text-white/40'
            }
          >
            {clinic.active ? 'Ativa' : 'Inativa'}
          </span>
        </div>
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-gold/20 bg-black/40">
            <Building2 className="h-5 w-5 text-gold-100" strokeWidth={1.4} />
          </div>
          <div>
            <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
              {clinic.trade_name}
            </h1>
            {clinic.legal_name && (
              <p className="mt-1 text-white/50">{clinic.legal_name}</p>
            )}
          </div>
        </div>
      </header>

      {/* Quick facts */}
      <section className="grid gap-3 md:grid-cols-3">
        {(clinic.city || clinic.state) && (
          <FactCard icon={MapPin} label="Localização">
            {[clinic.city, clinic.state].filter(Boolean).join(' · ')}
          </FactCard>
        )}
        {clinic.email && (
          <FactCard icon={Mail} label="E-mail">
            {clinic.email}
          </FactCard>
        )}
        {clinic.phone && (
          <FactCard icon={Phone} label="Telefone">
            {clinic.phone}
          </FactCard>
        )}
        {clinic.whatsapp && (
          <FactCard icon={MessageCircle} label="WhatsApp">
            {clinic.whatsapp}
          </FactCard>
        )}
      </section>

      {/* Linked dentists */}
      <section>
        <h2 className="font-display text-2xl text-white">Dentistas vinculados</h2>
        <p className="text-sm text-white/50">
          {links.length} {links.length === 1 ? 'dentista' : 'dentistas'}
        </p>
        <div className="mt-4 space-y-2">
          {links.length === 0 && (
            <p className="rounded-2xl border border-gold/10 bg-white/[0.02] p-6 text-sm text-white/50">
              Nenhum dentista vinculado ainda. Ao cadastrar um dentista, escolha
              esta clínica como primária.
            </p>
          )}
          {links.map((l) =>
            l.dentist ? (
              <Link
                key={l.id}
                href={`/dentistas/${l.dentist.id}`}
                className="flex items-center justify-between rounded-2xl border border-gold/10 bg-white/[0.02] p-4 transition hover:border-gold/30"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full border border-gold/20 bg-black/40">
                    <UserCircle2 className="h-4 w-4 text-gold-100" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-sm text-white">{l.dentist.full_name}</div>
                    <div className="text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
                      {[l.dentist.cro_state, l.dentist.cro_number].filter(Boolean).join('-') || '—'}
                      {l.dentist.specialty ? ` · ${l.dentist.specialty}` : ''}
                    </div>
                  </div>
                </div>
                <span className="rounded-full border border-gold/25 bg-gold/5 px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100">
                  {CUSTOMER_STATUS_LABELS[l.dentist.customer_status as CustomerStatus] ?? l.dentist.customer_status}
                </span>
              </Link>
            ) : null
          )}
        </div>
      </section>

      {/* Edit form */}
      <section>
        <h2 className="font-display text-2xl text-white">Editar dados</h2>
        <div className="mt-4 rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-8">
          <ClinicForm action={boundUpdate} clinic={clinic} submitLabel="Salvar alterações" />
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-3xl border border-rose-400/20 bg-rose-400/5 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[0.55rem] uppercase tracking-[0.3em] text-rose-200/80">
              Danger zone
            </div>
            <h3 className="mt-1 font-display text-lg text-white">Arquivar clínica</h3>
            <p className="text-xs text-white/50">
              Arquivamento lógico. Os dados são preservados para auditoria.
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
  children
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-[0.55rem] uppercase tracking-[0.32em] text-white/40">
        <Icon className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
        {label}
      </div>
      <div className="mt-2 text-sm text-white">{children}</div>
    </div>
  );
}
