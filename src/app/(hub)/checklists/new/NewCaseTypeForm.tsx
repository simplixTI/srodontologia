'use client';

import { useFormState, useFormStatus } from 'react-dom';
import {
  createCaseTypeAction,
  type ActionState
} from '@/features/checklists/actions/case-types';
import { Field, Input, Submit } from '@/components/ui/Field';

const initial: ActionState = { ok: false };

export function NewCaseTypeForm() {
  const [state, formAction] = useFormState(createCaseTypeAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field
        label="Código"
        htmlFor="code"
        hint="Identificador único em MAIÚSCULAS (ex.: PROTOCOLO_IMPLANTE)"
      >
        <Input
          id="code"
          name="code"
          required
          placeholder="PROTOCOLO_IMPLANTE"
          maxLength={64}
          pattern="[A-Z0-9_]+"
        />
      </Field>

      <Field label="Nome" htmlFor="name" hint="Nome exibido para dentistas.">
        <Input
          id="name"
          name="name"
          required
          placeholder="Protocolo sobre Implante"
          maxLength={120}
        />
      </Field>

      <Field label="Descrição (opcional)" htmlFor="description">
        <Input
          id="description"
          name="description"
          placeholder="Reabilitação total ou parcial sobre implantes."
          maxLength={500}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Ícone (opcional)"
          htmlFor="icon"
          hint="Nome de um ícone Lucide (ex.: Layers3, Route)"
        >
          <Input id="icon" name="icon" placeholder="Layers3" maxLength={64} />
        </Field>

        <Field
          label="Ordem"
          htmlFor="sort_order"
          hint="Menor aparece primeiro."
        >
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={100}
            min={0}
            max={9999}
          />
        </Field>
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-gold/10 bg-white/[0.02] px-4 py-3 text-sm text-white/70">
        <input
          type="checkbox"
          name="active"
          defaultChecked
          className="h-4 w-4 accent-[#C9A24B]"
        />
        <span>
          <span className="text-white">Ativo</span>
          <span className="ml-2 text-white/40">
            — dentistas só veem tipos ativos ao criar caso
          </span>
        </span>
      </label>

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
  return <Submit pending={pending}>Criar tipo de caso</Submit>;
}
