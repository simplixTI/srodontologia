'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Field, Input, Submit } from '@/components/ui/Field';
import { createCaseAction, type ActionState } from '@/features/cases/actions';

const initial: ActionState = { ok: false };

export function NewCaseForm({
  dentists,
  clinics,
  caseTypes
}: {
  dentists: { id: string; full_name: string; primary_clinic_id: string | null }[];
  clinics: { id: string; trade_name: string }[];
  caseTypes: { id: string; name: string }[];
}) {
  const [state, formAction] = useFormState(createCaseAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label="Dentista" htmlFor="dentist_id">
        <select
          id="dentist_id"
          name="dentist_id"
          required
          defaultValue=""
          className="h-11 w-full rounded-xl border border-gold/15 bg-black/40 px-4 text-sm text-white focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25"
        >
          <option value="" className="bg-black">— selecione —</option>
          {dentists.map((d) => (
            <option key={d.id} value={d.id} className="bg-black">
              {d.full_name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Clínica (opcional)" htmlFor="clinic_id">
        <select
          id="clinic_id"
          name="clinic_id"
          defaultValue=""
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

      <Field label="Tipo de caso" htmlFor="case_type_id" hint="Define o checklist que será instanciado.">
        <select
          id="case_type_id"
          name="case_type_id"
          defaultValue=""
          className="h-11 w-full rounded-xl border border-gold/15 bg-black/40 px-4 text-sm text-white focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25"
        >
          <option value="" className="bg-black">— selecionar depois —</option>
          {caseTypes.map((t) => (
            <option key={t.id} value={t.id} className="bg-black">
              {t.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Título do caso" htmlFor="title">
        <Input id="title" name="title" required placeholder="Ex.: Protocolo superior — DEMO 001" />
      </Field>

      {state?.error && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {state.error}
        </p>
      )}

      <SubmitBtn />
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <Submit pending={pending}>Criar rascunho</Submit>;
}
