'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Field, Input, Submit } from '@/components/ui/Field';
import { CUSTOMER_STATUSES, CUSTOMER_STATUS_LABELS } from '@/lib/validations/dentists';
import type { ActionState } from '@/features/dentists/actions';
import type { DentistWithRelations } from '@/features/dentists/queries';

type FormAction = (
  prev: ActionState | undefined,
  formData: FormData
) => Promise<ActionState>;

export function DentistForm({
  action,
  dentist,
  clinics,
  staff,
  submitLabel
}: {
  action: FormAction;
  dentist?: DentistWithRelations;
  clinics: { id: string; trade_name: string }[];
  staff: { id: string; full_name: string; role: string }[];
  submitLabel: string;
}) {
  const initial: ActionState = { ok: false };
  const [state, formAction] = useFormState(action, initial);

  return (
    <form action={formAction} className="grid gap-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <Field label="Nome completo" htmlFor="full_name">
          <Input
            id="full_name"
            name="full_name"
            required
            defaultValue={dentist?.full_name ?? ''}
            placeholder="Dr. João da Silva"
          />
        </Field>
      </div>

      <Field label="Especialidade" htmlFor="specialty">
        <Input
          id="specialty"
          name="specialty"
          defaultValue={dentist?.specialty ?? ''}
          placeholder="Implantodontia"
        />
      </Field>
      <Field label="Origem" htmlFor="source">
        <Input
          id="source"
          name="source"
          defaultValue={dentist?.source ?? ''}
          placeholder="Indicação, Instagram, Evento…"
        />
      </Field>

      <Field label="CRO" htmlFor="cro_number">
        <Input
          id="cro_number"
          name="cro_number"
          defaultValue={dentist?.cro_number ?? ''}
          placeholder="12345"
        />
      </Field>
      <Field label="UF do CRO" htmlFor="cro_state">
        <Input
          id="cro_state"
          name="cro_state"
          maxLength={2}
          defaultValue={dentist?.cro_state ?? ''}
          placeholder="MG"
          className="uppercase"
        />
      </Field>

      <Field label="E-mail" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={dentist?.email ?? ''}
          placeholder="dentista@exemplo.com"
        />
      </Field>
      <Field label="Telefone" htmlFor="phone">
        <Input
          id="phone"
          name="phone"
          defaultValue={dentist?.phone ?? ''}
          placeholder="+55 31 3000-0000"
        />
      </Field>
      <Field label="WhatsApp" htmlFor="whatsapp">
        <Input
          id="whatsapp"
          name="whatsapp"
          defaultValue={dentist?.whatsapp ?? ''}
          placeholder="+55 31 90000-0000"
        />
      </Field>
      <Field label="Instagram" htmlFor="instagram">
        <Input
          id="instagram"
          name="instagram"
          defaultValue={dentist?.instagram ?? ''}
          placeholder="@drjoaosilva"
        />
      </Field>

      <Field label="Cidade" htmlFor="city">
        <Input id="city" name="city" defaultValue={dentist?.city ?? ''} placeholder="Belo Horizonte" />
      </Field>
      <Field label="UF" htmlFor="state">
        <Input
          id="state"
          name="state"
          maxLength={2}
          defaultValue={dentist?.state ?? ''}
          placeholder="MG"
          className="uppercase"
        />
      </Field>

      <Field label="Clínica primária" htmlFor="primary_clinic_id">
        <select
          id="primary_clinic_id"
          name="primary_clinic_id"
          defaultValue={dentist?.primary_clinic_id ?? ''}
          className="h-11 w-full rounded-xl border border-gold/15 bg-black/40 px-4 text-sm text-white focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25"
        >
          <option value="" className="bg-black">— sem clínica —</option>
          {clinics.map((c) => (
            <option key={c.id} value={c.id} className="bg-black">
              {c.trade_name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Consultor responsável" htmlFor="commercial_owner_id">
        <select
          id="commercial_owner_id"
          name="commercial_owner_id"
          defaultValue={dentist?.commercial_owner_id ?? ''}
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

      <Field label="Status" htmlFor="customer_status">
        <select
          id="customer_status"
          name="customer_status"
          defaultValue={dentist?.customer_status ?? 'lead'}
          className="h-11 w-full rounded-xl border border-gold/15 bg-black/40 px-4 text-sm text-white focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25"
        >
          {CUSTOMER_STATUSES.map((s) => (
            <option key={s} value={s} className="bg-black">
              {CUSTOMER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Condição de pagamento" htmlFor="payment_terms">
        <Input
          id="payment_terms"
          name="payment_terms"
          defaultValue={dentist?.payment_terms ?? ''}
          placeholder="À vista com 5%"
        />
      </Field>

      <div className="md:col-span-2">
        <Field label="Observações" htmlFor="notes">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={dentist?.notes ?? ''}
            className="w-full rounded-xl border border-gold/15 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25"
          />
        </Field>
      </div>

      <div className="md:col-span-2">
        <label className="flex items-center gap-3 rounded-xl border border-gold/10 bg-white/[0.02] px-4 py-3 text-sm text-white/70">
          <input
            type="checkbox"
            name="active"
            defaultChecked={dentist?.active ?? true}
            className="h-4 w-4 accent-[#C9A24B]"
          />
          <span className="text-white">Dentista ativo</span>
        </label>
      </div>

      {state?.error && (
        <p className="md:col-span-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {state.error}
        </p>
      )}

      <div className="md:col-span-2">
        <SubmitBtn label={submitLabel} />
      </div>
    </form>
  );
}

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <Submit pending={pending}>{label}</Submit>;
}
