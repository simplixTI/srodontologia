'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Field, Input, Submit } from '@/components/ui/Field';
import type { ActionState } from '@/features/clinics/actions';
import type { Clinic } from '@/features/clinics/queries';

type FormAction = (
  prev: ActionState | undefined,
  formData: FormData
) => Promise<ActionState>;

export function ClinicForm({
  action,
  clinic,
  submitLabel
}: {
  action: FormAction;
  clinic?: Clinic;
  submitLabel: string;
}) {
  const initial: ActionState = { ok: false };
  const [state, formAction] = useFormState(action, initial);

  return (
    <form action={formAction} className="grid gap-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <Field label="Nome fantasia" htmlFor="trade_name">
          <Input
            id="trade_name"
            name="trade_name"
            required
            defaultValue={clinic?.trade_name ?? ''}
            placeholder="Clínica Odontocenter"
          />
        </Field>
      </div>
      <Field label="Razão social" htmlFor="legal_name">
        <Input
          id="legal_name"
          name="legal_name"
          defaultValue={clinic?.legal_name ?? ''}
          placeholder="Odontocenter Ltda"
        />
      </Field>
      <Field label="CNPJ / CPF" htmlFor="document">
        <Input
          id="document"
          name="document"
          defaultValue={clinic?.document ?? ''}
          placeholder="12.345.678/0001-99"
        />
      </Field>

      <Field label="E-mail" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={clinic?.email ?? ''}
          placeholder="contato@clinica.com.br"
        />
      </Field>
      <Field label="Telefone" htmlFor="phone">
        <Input
          id="phone"
          name="phone"
          defaultValue={clinic?.phone ?? ''}
          placeholder="+55 31 3000-0000"
        />
      </Field>

      <div className="md:col-span-2">
        <Field label="WhatsApp" htmlFor="whatsapp">
          <Input
            id="whatsapp"
            name="whatsapp"
            defaultValue={clinic?.whatsapp ?? ''}
            placeholder="+55 31 90000-0000"
          />
        </Field>
      </div>

      <div className="md:col-span-2 pt-2">
        <div className="mb-2 text-[0.55rem] uppercase tracking-[0.32em] text-white/40">
          Endereço
        </div>
      </div>

      <div className="md:col-span-2">
        <Field label="Logradouro" htmlFor="address_line">
          <Input
            id="address_line"
            name="address_line"
            defaultValue={clinic?.address_line ?? ''}
            placeholder="Av. do Contorno"
          />
        </Field>
      </div>
      <Field label="Número" htmlFor="address_number">
        <Input
          id="address_number"
          name="address_number"
          defaultValue={clinic?.address_number ?? ''}
          placeholder="9000"
        />
      </Field>
      <Field label="Complemento" htmlFor="address_complement">
        <Input
          id="address_complement"
          name="address_complement"
          defaultValue={clinic?.address_complement ?? ''}
          placeholder="Sala 202"
        />
      </Field>
      <Field label="Bairro" htmlFor="neighborhood">
        <Input
          id="neighborhood"
          name="neighborhood"
          defaultValue={clinic?.neighborhood ?? ''}
          placeholder="Funcionários"
        />
      </Field>
      <Field label="Cidade" htmlFor="city">
        <Input
          id="city"
          name="city"
          defaultValue={clinic?.city ?? ''}
          placeholder="Belo Horizonte"
        />
      </Field>
      <Field label="UF" htmlFor="state">
        <Input
          id="state"
          name="state"
          maxLength={2}
          defaultValue={clinic?.state ?? ''}
          placeholder="MG"
          className="uppercase"
        />
      </Field>
      <Field label="CEP" htmlFor="zip_code">
        <Input
          id="zip_code"
          name="zip_code"
          defaultValue={clinic?.zip_code ?? ''}
          placeholder="30110-000"
        />
      </Field>

      <div className="md:col-span-2 pt-2">
        <div className="mb-2 text-[0.55rem] uppercase tracking-[0.32em] text-white/40">
          Financeiro (opcional)
        </div>
      </div>
      <Field label="Contato financeiro" htmlFor="financial_contact_name">
        <Input
          id="financial_contact_name"
          name="financial_contact_name"
          defaultValue={clinic?.financial_contact_name ?? ''}
        />
      </Field>
      <Field label="Telefone financeiro" htmlFor="financial_contact_phone">
        <Input
          id="financial_contact_phone"
          name="financial_contact_phone"
          defaultValue={clinic?.financial_contact_phone ?? ''}
        />
      </Field>
      <Field label="E-mail financeiro" htmlFor="financial_contact_email">
        <Input
          id="financial_contact_email"
          name="financial_contact_email"
          type="email"
          defaultValue={clinic?.financial_contact_email ?? ''}
        />
      </Field>
      <Field label="Condição de pagamento" htmlFor="payment_terms">
        <Input
          id="payment_terms"
          name="payment_terms"
          defaultValue={clinic?.payment_terms ?? ''}
          placeholder="30/60 dias"
        />
      </Field>

      <div className="md:col-span-2">
        <Field label="Observações" htmlFor="notes">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={clinic?.notes ?? ''}
            className="w-full rounded-xl border border-gold/15 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25"
          />
        </Field>
      </div>

      <div className="md:col-span-2">
        <label className="flex items-center gap-3 rounded-xl border border-gold/10 bg-white/[0.02] px-4 py-3 text-sm text-white/70">
          <input
            type="checkbox"
            name="active"
            defaultChecked={clinic?.active ?? true}
            className="h-4 w-4 accent-[#C9A24B]"
          />
          <span className="text-white">Clínica ativa</span>
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
