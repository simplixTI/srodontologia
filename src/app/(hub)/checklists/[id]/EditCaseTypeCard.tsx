'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { Pencil, X, Trash2 } from 'lucide-react';
import type { CaseType } from '@/features/checklists/queries';
import {
  updateCaseTypeAction,
  deleteCaseTypeAction,
  toggleCaseTypeActive,
  type ActionState
} from '@/features/checklists/actions/case-types';
import { Field, Input, Submit } from '@/components/ui/Field';

export function EditCaseTypeCard({ caseType }: { caseType: CaseType }) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-6">
      {!editing ? (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={
                caseType.active
                  ? 'inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.3em] text-emerald-200'
                  : 'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.3em] text-white/40'
              }
            >
              <span
                className={
                  caseType.active
                    ? 'h-1 w-1 rounded-full bg-emerald-400'
                    : 'h-1 w-1 rounded-full bg-white/30'
                }
              />
              {caseType.active ? 'Ativo' : 'Inativo'}
            </span>
            <code className="rounded-md bg-white/[0.03] px-2 py-1 font-mono text-[0.65rem] tracking-wider text-white/60">
              {caseType.code}
            </code>
            <span className="text-[0.6rem] uppercase tracking-[0.3em] text-white/40">
              Ordem: {caseType.sort_order}
            </span>
            {caseType.icon && (
              <span className="text-[0.6rem] uppercase tracking-[0.3em] text-white/40">
                Ícone: {caseType.icon}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ActiveToggle id={caseType.id} active={caseType.active} />
            <button
              onClick={() => setEditing(true)}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-gold/25 px-4 text-[0.6rem] uppercase tracking-[0.3em] text-gold-100 transition hover:border-gold/60 hover:bg-gold/5"
            >
              <Pencil className="h-3 w-3" strokeWidth={1.5} />
              Editar
            </button>
            <DeleteButton id={caseType.id} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl text-white">Editar tipo de caso</h3>
            <button
              onClick={() => setEditing(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:border-gold/40 hover:text-gold-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <EditForm caseType={caseType} onDone={() => setEditing(false)} />
        </div>
      )}
    </div>
  );
}

function ActiveToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await toggleCaseTypeActive(id, !active);
        } finally {
          setPending(false);
        }
      }}
      className={
        active
          ? 'inline-flex h-9 items-center gap-2 rounded-full border border-white/10 px-4 text-[0.6rem] uppercase tracking-[0.3em] text-white/60 transition hover:border-gold/40 hover:text-gold-100 disabled:opacity-50'
          : 'inline-flex h-9 items-center gap-2 rounded-full border border-emerald-400/40 px-4 text-[0.6rem] uppercase tracking-[0.3em] text-emerald-200 transition hover:bg-emerald-400/10 disabled:opacity-50'
      }
    >
      {active ? 'Desativar' : 'Ativar'}
    </button>
  );
}

function DeleteButton({ id }: { id: string }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      disabled={pending}
      onClick={async () => {
        if (
          !confirm(
            'Remover este tipo de caso? Todos os itens do checklist também serão apagados. Esta ação não pode ser desfeita.'
          )
        )
          return;
        setPending(true);
        try {
          await deleteCaseTypeAction(id);
        } catch (e) {
          setPending(false);
          alert('Falha ao remover: ' + (e as Error).message);
        }
      }}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-rose-400/30 px-4 text-[0.6rem] uppercase tracking-[0.3em] text-rose-200 transition hover:bg-rose-400/10 disabled:opacity-50"
    >
      <Trash2 className="h-3 w-3" strokeWidth={1.5} />
      Remover
    </button>
  );
}

function EditForm({
  caseType,
  onDone
}: {
  caseType: CaseType;
  onDone: () => void;
}) {
  const bound = updateCaseTypeAction.bind(null, caseType.id);
  const initial: ActionState = { ok: false };
  const [state, formAction] = useFormState(bound, initial);

  if (state.ok && state.id) setTimeout(onDone, 100);

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <Field label="Código" htmlFor="code" hint="MAIÚSCULAS, números e _">
          <Input
            id="code"
            name="code"
            defaultValue={caseType.code}
            required
            pattern="[A-Z0-9_]+"
          />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Nome" htmlFor="name">
          <Input id="name" name="name" defaultValue={caseType.name} required />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Descrição" htmlFor="description">
          <Input
            id="description"
            name="description"
            defaultValue={caseType.description ?? ''}
          />
        </Field>
      </div>
      <Field label="Ícone" htmlFor="icon" hint="Lucide icon name">
        <Input id="icon" name="icon" defaultValue={caseType.icon ?? ''} />
      </Field>
      <Field label="Ordem" htmlFor="sort_order">
        <Input
          id="sort_order"
          name="sort_order"
          type="number"
          defaultValue={caseType.sort_order}
          min={0}
        />
      </Field>
      <div className="md:col-span-2">
        <label className="flex items-center gap-3 rounded-xl border border-gold/10 bg-white/[0.02] px-4 py-3 text-sm text-white/70">
          <input
            type="checkbox"
            name="active"
            defaultChecked={caseType.active}
            className="h-4 w-4 accent-[#C9A24B]"
          />
          <span className="text-white">Ativo</span>
        </label>
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
