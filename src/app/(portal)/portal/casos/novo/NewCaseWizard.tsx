'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createDentistCaseAction, type ActionState } from '@/features/portal/actions';

type CaseType = {
  id: string;
  name: string;
  description: string | null;
};

const initial: ActionState = { ok: false };

export function NewCaseWizard({ caseTypes }: { caseTypes: CaseType[] }) {
  const [state, formAction] = useFormState(createDentistCaseAction, initial);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [title, setTitle] = useState('');

  const totalSteps = 3;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* Stepper */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex flex-1 flex-col gap-1">
            <div
              className={
                n <= step
                  ? 'h-1 rounded-full bg-gold-300'
                  : 'h-1 rounded-full bg-white/10'
              }
            />
            <div
              className={
                n <= step
                  ? 'text-[0.55rem] uppercase tracking-[0.28em] text-gold-100'
                  : 'text-[0.55rem] uppercase tracking-[0.28em] text-white/40'
              }
            >
              {n === 1 ? 'Tipo de caso' : n === 2 ? 'Dados clínicos' : 'Revisão'}
            </div>
          </div>
        ))}
      </div>

      {step === 1 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm text-white">Qual é o tipo de trabalho?</h2>
          <ul className="grid gap-2 md:grid-cols-2">
            {caseTypes.map((t) => (
              <li key={t.id}>
                <label
                  className={
                    selectedTypeId === t.id
                      ? 'flex cursor-pointer flex-col gap-1 rounded-2xl border border-gold/40 bg-gold/[0.05] p-4'
                      : 'flex cursor-pointer flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-gold/25'
                  }
                >
                  <input
                    type="radio"
                    name="case_type_id"
                    value={t.id}
                    checked={selectedTypeId === t.id}
                    onChange={() => setSelectedTypeId(t.id)}
                    className="sr-only"
                  />
                  <div className="text-sm text-white">{t.name}</div>
                  {t.description && (
                    <div className="text-xs text-white/50">{t.description}</div>
                  )}
                </label>
              </li>
            ))}
            <li>
              <label
                className={
                  selectedTypeId === ''
                    ? 'flex cursor-pointer flex-col gap-1 rounded-2xl border border-gold/40 bg-gold/[0.05] p-4'
                    : 'flex cursor-pointer flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-gold/25'
                }
              >
                <input
                  type="radio"
                  name="case_type_id_none"
                  checked={selectedTypeId === ''}
                  onChange={() => setSelectedTypeId('')}
                  className="sr-only"
                />
                <div className="text-sm text-white">Não sei ainda</div>
                <div className="text-xs text-white/50">
                  Nossa equipe ajuda a classificar depois.
                </div>
              </label>
            </li>
          </ul>

          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-full border border-gold/40 bg-gold/10 px-5 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 hover:bg-gold/20"
            >
              Próximo
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm text-white">Dados do caso</h2>

          <Field label="Título / paciente ou identificação *">
            <input
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              minLength={2}
              maxLength={200}
              placeholder="Ex.: Coroa cerâmica · elemento 26 · Sr. João"
              className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none"
            />
          </Field>

          <Field label="Descrição clínica">
            <textarea
              name="clinical_description"
              rows={4}
              maxLength={5000}
              placeholder="Descreva a situação clínica, expectativa estética, particularidades..."
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none"
            />
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Material desejado">
              <input
                name="material"
                maxLength={200}
                placeholder="Ex.: Zircônia translúcida"
                className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none"
              />
            </Field>
            <Field label="Cor">
              <input
                name="shade"
                maxLength={100}
                placeholder="Ex.: A2"
                className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none"
              />
            </Field>
          </div>

          <Field label="Data solicitada de entrega">
            <input
              type="date"
              name="requested_delivery_date"
              className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none md:w-64"
            />
          </Field>

          <div className="mt-2 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-full border border-white/15 px-5 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-white/70 hover:border-white/30 hover:text-white"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={title.trim().length < 2}
              className="rounded-full border border-gold/40 bg-gold/10 px-5 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 hover:bg-gold/20 disabled:opacity-50"
            >
              Próximo
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm text-white">Revisão</h2>
          <div className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4 text-sm text-white/80">
            <div className="text-white">{title || '—'}</div>
            <div className="mt-2 text-xs text-white/50">
              Tipo:{' '}
              {caseTypes.find((c) => c.id === selectedTypeId)?.name ??
                'A definir com o laboratório'}
            </div>
            <p className="mt-3 text-xs text-white/50">
              Após criar o caso, você poderá anexar arquivos (fotos, tomografia,
              STL), preencher o checklist obrigatório e então enviar ao
              laboratório para análise.
            </p>
          </div>

          {state.error && (
            <p className="rounded-xl border border-red-400/30 bg-red-400/5 p-3 text-xs text-red-200">
              {state.error}
            </p>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-full border border-white/15 px-5 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-white/70 hover:border-white/30 hover:text-white"
            >
              Voltar
            </button>
            <SubmitButton />
          </div>
        </section>
      )}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-gold/40 bg-gold/10 px-5 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 hover:bg-gold/20 disabled:opacity-50"
    >
      {pending ? 'Criando…' : 'Criar caso em rascunho'}
    </button>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[0.55rem] uppercase tracking-[0.25em] text-white/50">
        {label}
      </span>
      {children}
    </label>
  );
}
