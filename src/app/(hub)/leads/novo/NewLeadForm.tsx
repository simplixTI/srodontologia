'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Field, Input, Submit } from '@/components/ui/Field';
import { CUSTOMER_STATUSES, CUSTOMER_STATUS_LABELS } from '@/lib/validations/dentists';
import { createLeadAction, type ActionState } from '@/features/leads/actions';

const initial: ActionState = { ok: false };

export function NewLeadForm({
  staff
}: {
  staff: { id: string; full_name: string }[];
}) {
  const [state, formAction] = useFormState(createLeadAction, initial);

  return (
    <form action={formAction} className="grid gap-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <Field label="Nome completo" htmlFor="full_name">
          <Input id="full_name" name="full_name" required placeholder="Dra. Maria Silva" />
        </Field>
      </div>
      <Field label="Clínica (texto livre)" htmlFor="clinic_name">
        <Input id="clinic_name" name="clinic_name" placeholder="Consultório Autônomo" />
      </Field>
      <Field label="Especialidade" htmlFor="specialty">
        <Input id="specialty" name="specialty" placeholder="Implantodontia" />
      </Field>
      <Field label="CRO" htmlFor="cro_number">
        <Input id="cro_number" name="cro_number" placeholder="12345" />
      </Field>
      <Field label="UF do CRO" htmlFor="cro_state">
        <Input id="cro_state" name="cro_state" maxLength={2} placeholder="MG" className="uppercase" />
      </Field>
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" placeholder="dentista@exemplo.com" />
      </Field>
      <Field label="Telefone" htmlFor="phone">
        <Input id="phone" name="phone" placeholder="+55 31 3000-0000" />
      </Field>
      <Field label="WhatsApp" htmlFor="whatsapp">
        <Input id="whatsapp" name="whatsapp" placeholder="+55 31 90000-0000" />
      </Field>
      <Field label="Instagram" htmlFor="instagram">
        <Input id="instagram" name="instagram" placeholder="@drmaria" />
      </Field>
      <Field label="Cidade" htmlFor="city">
        <Input id="city" name="city" placeholder="Belo Horizonte" />
      </Field>
      <Field label="UF" htmlFor="state">
        <Input id="state" name="state" maxLength={2} placeholder="MG" className="uppercase" />
      </Field>
      <Field label="Origem" htmlFor="source">
        <Input id="source" name="source" placeholder="Indicação, Instagram, Evento…" />
      </Field>
      <Field label="Etapa do pipeline" htmlFor="pipeline_stage">
        <select
          id="pipeline_stage"
          name="pipeline_stage"
          defaultValue="lead"
          className="h-11 w-full rounded-xl border border-gold/15 bg-black/40 px-4 text-sm text-white focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25"
        >
          {CUSTOMER_STATUSES.map((s) => (
            <option key={s} value={s} className="bg-black">
              {CUSTOMER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Consultor responsável" htmlFor="commercial_owner_id">
        <select
          id="commercial_owner_id"
          name="commercial_owner_id"
          defaultValue=""
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
        <Input id="estimated_value" name="estimated_value" type="number" min={0} step="0.01" />
      </Field>
      <Field label="Próximo contato" htmlFor="next_follow_up_at">
        <Input id="next_follow_up_at" name="next_follow_up_at" type="date" />
      </Field>
      <div className="md:col-span-2">
        <Field label="Observações" htmlFor="notes">
          <textarea
            id="notes"
            name="notes"
            rows={3}
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
  return <Submit pending={pending}>Cadastrar lead</Submit>;
}
