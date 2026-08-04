import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  UserPlus,
  Trash2,
  MessageCircle,
  Phone,
  Mail,
  Instagram,
  MapPin,
  Calendar,
  type LucideIcon
} from 'lucide-react';
import { getLead, getLeadActivities } from '@/features/leads/queries';
import { listInternalStaff } from '@/features/dentists/queries';
import { EditLeadForm } from './EditLeadForm';
import { LeadActions } from './LeadActions';
import { statusColor } from '@/components/hub/crm/statusColors';
import { CUSTOMER_STATUS_LABELS, type CustomerStatus } from '@/lib/validations/dentists';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params
}: {
  params: { id: string };
}): Promise<Metadata> {
  const l = await getLead(params.id);
  return { title: l ? `${l.full_name} · Lead · SR HUB` : 'Lead · SR HUB' };
}

export default async function LeadDetailPage({
  params
}: {
  params: { id: string };
}) {
  const [lead, activities, staff] = await Promise.all([
    getLead(params.id),
    getLeadActivities(params.id),
    listInternalStaff()
  ]);
  if (!lead) notFound();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10 md:px-10">
      <Link
        href="/leads"
        className="group inline-flex items-center gap-2 self-start text-[0.65rem] uppercase tracking-[0.32em] text-white/60 transition hover:text-gold-100"
      >
        <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
        Pipeline
      </Link>

      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Lead
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
          <span className={statusColor(lead.pipeline_stage as CustomerStatus)}>
            {CUSTOMER_STATUS_LABELS[lead.pipeline_stage as CustomerStatus]}
          </span>
        </div>

        <div>
          <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
            {lead.full_name}
          </h1>
          {lead.clinic_name && (
            <p className="mt-1 text-white/50">{lead.clinic_name}</p>
          )}
        </div>

        {lead.converted_dentist_id ? (
          <Link
            href={`/dentistas/${lead.converted_dentist_id}`}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.3em] text-emerald-200 transition hover:bg-emerald-400/15"
          >
            Convertido — ver dentista →
          </Link>
        ) : (
          <LeadActions leadId={lead.id} />
        )}
      </header>

      {/* Quick facts */}
      <section className="grid gap-3 md:grid-cols-3">
        {(lead.city || lead.state) && (
          <FactCard icon={MapPin} label="Localização">
            {[lead.city, lead.state].filter(Boolean).join(' · ')}
          </FactCard>
        )}
        {lead.email && (
          <FactCard icon={Mail} label="E-mail">
            {lead.email}
          </FactCard>
        )}
        {lead.phone && (
          <FactCard icon={Phone} label="Telefone">
            {lead.phone}
          </FactCard>
        )}
        {lead.whatsapp && (
          <FactCard icon={MessageCircle} label="WhatsApp">
            {lead.whatsapp}
          </FactCard>
        )}
        {lead.instagram && (
          <FactCard icon={Instagram} label="Instagram">
            @{lead.instagram}
          </FactCard>
        )}
        {lead.next_follow_up_at && (
          <FactCard icon={Calendar} label="Próximo contato">
            {new Date(lead.next_follow_up_at).toLocaleDateString('pt-BR')}
          </FactCard>
        )}
      </section>

      {/* Activity timeline */}
      <section>
        <h2 className="font-display text-2xl text-white">Histórico</h2>
        <div className="mt-4 flex flex-col gap-2">
          {activities.length === 0 && (
            <p className="rounded-2xl border border-gold/10 bg-white/[0.02] p-6 text-sm text-white/50">
              Nenhuma atividade registrada ainda. Ações como mover no pipeline
              ou converter em dentista aparecem aqui automaticamente.
            </p>
          )}
          {activities.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded-2xl border border-gold/10 bg-white/[0.02] p-4"
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-gold/20 bg-black/40 text-[0.55rem] uppercase tracking-[0.2em] text-gold-100">
                {a.activity_type.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white">{a.title}</div>
                {a.description && (
                  <p className="mt-1 text-xs text-white/50">{a.description}</p>
                )}
                <div className="mt-2 text-[0.55rem] uppercase tracking-[0.25em] text-white/40">
                  {a.user?.full_name ? `${a.user.full_name} · ` : ''}
                  {new Date(a.created_at).toLocaleString('pt-BR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Edit form */}
      <section>
        <h2 className="font-display text-2xl text-white">Editar dados</h2>
        <div className="mt-4 rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-8">
          <EditLeadForm lead={lead} staff={staff} />
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
