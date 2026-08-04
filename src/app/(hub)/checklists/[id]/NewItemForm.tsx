'use client';

import { useState, useRef, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Plus } from 'lucide-react';
import {
  createTemplateItemAction,
  type ActionState
} from '@/features/checklists/actions/templates';
import {
  CATEGORY_LABELS,
  CHECKLIST_CATEGORIES,
  TEXT_ONLY_CATEGORIES,
  type ChecklistCategory
} from '@/lib/validations/checklists';
import { Field, Input, Submit } from '@/components/ui/Field';

const initial: ActionState = { ok: false };

export function NewItemForm({
  caseTypeId,
  nextSortOrder
}: {
  caseTypeId: string;
  nextSortOrder: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(createTemplateItemAction, initial);
  const [category, setCategory] = useState<ChecklistCategory>('stl');
  const isTextOnly = TEXT_ONLY_CATEGORIES.includes(category);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setCategory('stl');
    }
  }, [state.ok]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-2 self-start rounded-full border border-dashed border-gold/30 bg-transparent px-5 py-3 text-[0.65rem] uppercase tracking-[0.28em] text-gold-100 transition hover:border-gold/60 hover:bg-gold/5"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        Adicionar item ao checklist
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-gold/20 bg-white/[0.02] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-display text-lg text-white">Novo item do checklist</h4>
        <button
          onClick={() => setOpen(false)}
          className="text-[0.6rem] uppercase tracking-[0.3em] text-white/50 hover:text-gold-100"
        >
          cancelar
        </button>
      </div>

      <form ref={formRef} action={formAction} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="case_type_id" value={caseTypeId} />
        <div className="md:col-span-2">
          <Field label="Título" htmlFor="new-title">
            <Input id="new-title" name="title" required placeholder="STL Superior" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Descrição (opcional)" htmlFor="new-description">
            <Input
              id="new-description"
              name="description"
              placeholder="Escaneamento intraoral da arcada superior."
            />
          </Field>
        </div>
        <Field label="Código (opcional)" htmlFor="new-code">
          <Input
            id="new-code"
            name="code"
            pattern="[A-Z0-9_]*"
            placeholder="STL_SUPERIOR"
          />
        </Field>
        <Field label="Categoria" htmlFor="new-category">
          <select
            id="new-category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ChecklistCategory)}
            className="h-11 w-full rounded-xl border border-gold/15 bg-black/40 px-4 text-sm text-white focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25"
          >
            {CHECKLIST_CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-black text-white">
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ordem" htmlFor="new-sort_order">
          <Input
            id="new-sort_order"
            name="sort_order"
            type="number"
            defaultValue={nextSortOrder}
            min={0}
          />
        </Field>
        <div className="md:col-span-2">
          <label className="flex items-center gap-3 rounded-xl border border-gold/10 bg-white/[0.02] px-4 py-3 text-sm text-white/70">
            <input
              type="checkbox"
              name="required"
              defaultChecked
              className="h-4 w-4 accent-[#C9A24B]"
            />
            <span className="text-white">Obrigatório</span>
          </label>
        </div>
        {!isTextOnly ? (
          <>
            <div className="md:col-span-2">
              <Field
                label="Formatos aceitos"
                htmlFor="new-accepted_file_types"
                hint="Ex.: stl, obj, pdf"
              >
                <Input
                  id="new-accepted_file_types"
                  name="accepted_file_types"
                  defaultValue="stl, obj"
                />
              </Field>
            </div>
            <Field label="Mín. arquivos" htmlFor="new-minimum_files">
              <Input
                id="new-minimum_files"
                name="minimum_files"
                type="number"
                defaultValue={1}
                min={0}
              />
            </Field>
            <Field label="Máx. arquivos" htmlFor="new-maximum_files">
              <Input
                id="new-maximum_files"
                name="maximum_files"
                type="number"
                defaultValue={1}
                min={0}
              />
            </Field>
          </>
        ) : (
          <>
            <input type="hidden" name="accepted_file_types" value="" />
            <input type="hidden" name="minimum_files" value="0" />
            <input type="hidden" name="maximum_files" value="0" />
          </>
        )}

        {state?.error && (
          <p className="md:col-span-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p className="md:col-span-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            Item adicionado. Adicione outro ou clique em cancelar para fechar.
          </p>
        )}

        <div className="md:col-span-2">
          <SubmitBtn />
        </div>
      </form>
    </div>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <Submit pending={pending}>Adicionar item</Submit>;
}
