'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Field, Input, Submit } from '@/components/ui/Field';
import { CUSTOMER_STATUSES, CUSTOMER_STATUS_LABELS } from '@/lib/validations/dentists';
import { updateLeadAction, type ActionState } from '@/features/leads/actions';
import type { Lead } from '@/features/leads/queries';

const initial: ActionState = { ok: false };

export function EditLeadForm({
  lead,
  staff
}: {
  lead: Lead;
  staff: { id: string; full_name: string }[];
}) {
  const bound = updateLeadAction.bind(null, lead.id);
  const [state, formAction] = useFormState(bound, initial);

  return (
    <form action={formAction} className="grid gap-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <Field label="Nome completo" htmlFor="full_name">
          <Input id="full_name" name="full_name" required defaultValue={lead.full_name} />
        </Field>
      </div>
      <Field label="Clínica" htmlFor="clinic_name">
        <Input id="clinic_name" name="clinic_name" defaultValue={lead.clinic_name ?? ''} />
      </Field>
      <Field label="Especialidade" htmlFor="specialty">
        <Input id="specialty" name="specialty" defaultValue={lead.specialty ?? ''} />
      </Field>
      <Field label="CRO" htmlFor="cro_number">
        <Input id="cro_number" name="cro_number" defaultValue={lead.cro_number ?? ''} />
      </Field>
      <Field label="UF do CRO" htmlFor="cro_state">
        <Input id="cro_state" name="cro_state" maxLength={2} defaultValue={lead.cro_state ?? ''} className="uppercase" />
      </Field>
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" defaultValue={lead.email ?? ''} />
      </Field>
      <Field label="Telefone" htmlFor="phone">
        <Input id="phone" name="phone" defaultValue={lead.phone ?? ''} />
      </Field>
      <Field label="WhatsApp" htmlFor="whatsapp">
        <Input id="whatsapp" name="whatsapp" defaultValue={lead.whatsapp ?? ''} />
      </Field>
      <Field label="Instagram" htmlFor="instagram">
        <Input id="instagram" name="instagram" defaultValue={lead.instagram ?? ''} />
      </Field>
      <Field label="Cidade" htmlFor="city">
        <Input id="city" name="city" defaultValue={lead.city ?? ''} />
      </Field>
      <Field label="UF" htmlFor="state">
        <Input id="state" name="state" maxLength={2} defaultValue={lead.state ?? ''} className="uppercase" />
      </Field>
      <Field label="Origem" htmlFor="source">
        <Input id="source" name="source" defaultValue={lead.source ?? ''} />
      </Field>
      <Field label="Etapa" htmlFor="pipeline_stage">
        <select
          id="pipeline_stage"
          name="pipeline_stage"
          defaultValue={lead.pipeline_stage}
          className="h-11 w-full rounded-xl border border-gold/15 bg-black/40 px-4 text-sm text-white focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25"
        >
          {CUSTOMER_STATUSES.map((s) => (
            <option key={s} value={s} className="bg-black">
              {CUSTOMER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Consultor" htmlFor="commercial_owner_id">
        <select
          id="commercial_owner_id"
          name="commercial_owner_id"
          defaultValue={lead.commercial_owner_id ?? ''}
          className="h-11 w-full rounded-xl border border-gold/15 bg-black/40 px-4 text-sm text-white focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25"
        >
          <option value="" className="bg-black">— sem consultor —</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id} className="bg-black">
              {s.full_name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Valor estimado (R$)" htmlFor="estimated_value">
        <Input
          id="estimated_value"
          name="estimated_value"
          type="number"
          min={0}
          step="0.01"
          defaultValue={lead.estimated_value ?? ''}
        />
      </Field>
      <Field label="Próximo contato" htmlFor="next_follow_up_at">
        <Input
          id="next_follow_up_at"
          name="next_follow_up_at"
          type="date"
          defaultValue={lead.next_follow_up_at ? lead.next_follow_up_at.slice(0, 10) : ''}
        />
      </Field>
      <div className="md:col-span-2">
        <Field label="Observações" htmlFor="notes">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={lead.notes ?? ''}
            className="w-full rounded-xl border border-gold/15 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25"
          />
        </Field>
      </div>

      {state?.error && (
        <p className="md:col-span-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {state.error}
        </p>
      )}

      <div className="md:col-span-2">
        <SubmitBtn />
      </div>
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <Submit pending={pending}>Salvar alterações</Submit>;
}
