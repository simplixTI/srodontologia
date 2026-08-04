'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { MapPin, Phone, Instagram, MoreHorizontal } from 'lucide-react';
import type { Lead } from '@/features/leads/queries';
import { CUSTOMER_STATUS_LABELS, type CustomerStatus } from '@/lib/validations/dentists';
import { statusColor } from '@/components/hub/crm/statusColors';
import { updateLeadStageAction } from '@/features/leads/actions';

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

export function LeadsKanban({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<CustomerStatus | null>(null);
  const [, startTransition] = useTransition();

  const byStage = new Map<CustomerStatus, Lead[]>();
  for (const s of PIPELINE) byStage.set(s, []);
  for (const l of leads) {
    const stage = l.pipeline_stage;
    (byStage.get(stage) ?? []).push(l);
  }

  const handleDragStart = (leadId: string) => {
    setDraggingId(leadId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setOverStage(null);
  };

  const handleDrop = async (stage: CustomerStatus) => {
    if (!draggingId) return;
    const lead = leads.find((l) => l.id === draggingId);
    if (!lead || lead.pipeline_stage === stage) {
      handleDragEnd();
      return;
    }

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === draggingId ? { ...l, pipeline_stage: stage } : l))
    );

    startTransition(async () => {
      try {
        await updateLeadStageAction(draggingId, stage);
      } catch (e) {
        // Revert on error
        setLeads((prev) =>
          prev.map((l) => (l.id === draggingId ? { ...l, pipeline_stage: lead.pipeline_stage } : l))
        );
        alert('Falha ao mover: ' + (e as Error).message);
      }
    });

    handleDragEnd();
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {PIPELINE.map((stage) => {
        const items = byStage.get(stage) ?? [];
        const isOver = overStage === stage;

        return (
          <div
            key={stage}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (overStage !== stage) setOverStage(stage);
            }}
            onDragLeave={(e) => {
              // Only clear if leaving the container itself
              if (e.currentTarget === e.target) setOverStage(null);
            }}
            onDrop={() => handleDrop(stage)}
            className={
              'rounded-2xl border p-4 transition-colors ' +
              (isOver
                ? 'border-gold/50 bg-gold/[0.05]'
                : 'border-gold/10 bg-white/[0.02]')
            }
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
                <div
                  className={
                    'rounded-xl border border-dashed p-3 text-center text-[0.6rem] uppercase tracking-[0.28em] transition ' +
                    (isOver
                      ? 'border-gold/40 text-gold-100'
                      : 'border-white/10 text-white/25')
                  }
                >
                  {isOver ? 'soltar aqui' : 'vazio'}
                </div>
              )}
              {items.map((l) => (
                <LeadCard
                  key={l.id}
                  lead={l}
                  isDragging={draggingId === l.id}
                  onDragStart={() => handleDragStart(l.id)}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeadCard({
  lead,
  isDragging,
  onDragStart,
  onDragEnd
}: {
  lead: Lead;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', lead.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={
        'group cursor-grab rounded-xl border border-gold/10 bg-black/40 p-3 transition ' +
        (isDragging ? 'opacity-40' : 'hover:border-gold/30 active:cursor-grabbing')
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/leads/${lead.id}`}
            className="block truncate text-sm text-white hover:text-gold-100"
          >
            {lead.full_name}
          </Link>
          {lead.clinic_name && (
            <div className="mt-0.5 truncate text-[0.65rem] text-white/50">
              {lead.clinic_name}
            </div>
          )}
        </div>
        <Link
          href={`/leads/${lead.id}`}
          className="shrink-0 text-white/30 opacity-0 transition group-hover:opacity-100 hover:text-gold-100"
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </div>

      <ul className="mt-2 space-y-0.5 text-[0.6rem] text-white/45">
        {(lead.city || lead.state) && (
          <li className="flex items-center gap-1.5">
            <MapPin className="h-2.5 w-2.5 text-gold-300" strokeWidth={1.5} />
            {[lead.city, lead.state].filter(Boolean).join(' · ')}
          </li>
        )}
        {lead.whatsapp && (
          <li className="flex items-center gap-1.5">
            <Phone className="h-2.5 w-2.5 text-gold-300" strokeWidth={1.5} />
            {lead.whatsapp}
          </li>
        )}
        {lead.instagram && (
          <li className="flex items-center gap-1.5">
            <Instagram className="h-2.5 w-2.5 text-gold-300" strokeWidth={1.5} />
            @{lead.instagram}
          </li>
        )}
      </ul>

      {lead.estimated_value != null && (
        <div className="mt-2 text-[0.65rem] font-medium text-gold-100">
          R${' '}
          {Number(lead.estimated_value).toLocaleString('pt-BR', {
            minimumFractionDigits: 2
          })}
        </div>
      )}

      {lead.converted_dentist_id && (
        <div className="mt-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-center text-[0.55rem] uppercase tracking-[0.25em] text-emerald-200">
          convertido
        </div>
      )}
    </div>
  );
}
