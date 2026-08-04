import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, MapPin, Phone, Instagram, Sparkles } from 'lucide-react';
import { listLeads } from '@/features/leads/queries';
import { CUSTOMER_STATUS_LABELS, type CustomerStatus } from '@/lib/validations/dentists';
import { statusColor } from '@/components/hub/crm/statusColors';

export const metadata: Metadata = { title: 'Leads · SR HUB' };
export const dynamic = 'force-dynamic';

// Ordered pipeline stages for the "kanban-lite" board
const PIPELINE: CustomerStatus[] = [
  'lead',
  'contacted',
  'presentation_scheduled',
  'presentation_completed',
  'first_case',
  'active_customer',
  'premium_customer',
  'inactive_customer',
  'lost'
];

export default async function LeadsPage() {
  const leads = await listLeads();

  const byStage = new Map<CustomerStatus, typeof leads>();
  for (const s of PIPELINE) byStage.set(s, []);
  for (const l of leads) {
    const stage = l.pipeline_stage as CustomerStatus;
    (byStage.get(stage) ?? []).push(l);
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            CRM · Pipeline
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>

        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
              CRM — Pipeline
            </h1>
            <p className="mt-3 max-w-2xl text-white/60">
              Prospects e clientes por etapa. Total: <strong className="text-white">{leads.length}</strong>{' '}
              {leads.length === 1 ? 'lead' : 'leads'}.
            </p>
            <p className="mt-1 text-xs text-white/40">
              Drag &amp; drop entre colunas chega na próxima tranche. Por ora,
              edite pela ficha do lead ou pela ficha do dentista convertido.
            </p>
          </div>

          <Link
            href="/leads/novo"
            className="btn-gold group inline-flex h-12 items-center gap-2 rounded-full px-6 text-[0.72rem] uppercase tracking-[0.22em]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} /> Novo lead
          </Link>
        </div>
      </header>

      {leads.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-gold/10 bg-white/[0.02] p-14 text-center">
          <Sparkles className="h-6 w-6 text-gold-300" strokeWidth={1.5} />
          <h2 className="mt-4 font-display text-2xl text-white">Nenhum lead cadastrado</h2>
          <p className="mt-3 text-sm text-white/60">
            Cadastre o primeiro lead para iniciar o pipeline comercial.
          </p>
          <Link
            href="/leads/novo"
            className="btn-gold mt-8 inline-flex h-11 items-center gap-2 rounded-full px-6 text-[0.7rem] uppercase tracking-[0.22em]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} /> Novo lead
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {PIPELINE.map((stage) => {
            const items = byStage.get(stage) ?? [];
            return (
              <div
                key={stage}
                className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className={statusColor(stage)}>
                    {CUSTOMER_STATUS_LABELS[stage]}
                  </span>
                  <span className="font-mono text-[0.55rem] text-white/40">
                    {items.length.toString().padStart(2, '0')}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {items.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/10 p-3 text-center text-[0.6rem] uppercase tracking-[0.28em] text-white/25">
                      vazio
                    </div>
                  )}
                  {items.map((l) => (
                    <div
                      key={l.id}
                      className="rounded-xl border border-gold/10 bg-black/40 p-3"
                    >
                      <div className="text-sm text-white">{l.full_name}</div>
                      {l.clinic_name && (
                        <div className="mt-0.5 text-[0.65rem] text-white/50">
                          {l.clinic_name}
                        </div>
                      )}
                      <ul className="mt-2 space-y-0.5 text-[0.6rem] text-white/45">
                        {(l.city || l.state) && (
                          <li className="flex items-center gap-1.5">
                            <MapPin className="h-2.5 w-2.5 text-gold-300" strokeWidth={1.5} />
                            {[l.city, l.state].filter(Boolean).join(' · ')}
                          </li>
                        )}
                        {l.whatsapp && (
                          <li className="flex items-center gap-1.5">
                            <Phone className="h-2.5 w-2.5 text-gold-300" strokeWidth={1.5} />
                            {l.whatsapp}
                          </li>
                        )}
                        {l.instagram && (
                          <li className="flex items-center gap-1.5">
                            <Instagram className="h-2.5 w-2.5 text-gold-300" strokeWidth={1.5} />
                            @{l.instagram}
                          </li>
                        )}
                      </ul>
                      {l.estimated_value != null && (
                        <div className="mt-2 text-[0.65rem] font-medium text-gold-100">
                          R$ {Number(l.estimated_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
