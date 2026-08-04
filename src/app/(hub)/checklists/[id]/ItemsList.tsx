'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  X,
  ShieldCheck,
  Circle
} from 'lucide-react';
import type { TemplateItem } from '@/features/checklists/queries';
import { CategoryIcon } from '@/components/hub/checklists/CategoryIcon';
import {
  CATEGORY_LABELS,
  CHECKLIST_CATEGORIES,
  TEXT_ONLY_CATEGORIES,
  type ChecklistCategory
} from '@/lib/validations/checklists';
import {
  deleteTemplateItemAction,
  reorderItemAction,
  toggleRequiredAction,
  updateTemplateItemAction,
  type ActionState
} from '@/features/checklists/actions/templates';
import { Field, Input, Submit } from '@/components/ui/Field';

export function ItemsList({ items }: { items: TemplateItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-gold/10 bg-white/[0.02] p-8 text-center text-sm text-white/50">
        Nenhum item ainda. Use o formulário abaixo para adicionar o primeiro.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((it, i) => (
        <ItemRow
          key={it.id}
          item={it}
          isFirst={i === 0}
          isLast={i === items.length - 1}
        />
      ))}
    </ul>
  );
}

function ItemRow({
  item,
  isFirst,
  isLast
}: {
  item: TemplateItem;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const confirm = useConfirm();

  const busy = async (fn: () => Promise<unknown>) => {
    setPending(true);
    try {
      await fn();
    } catch (e) {
      toast.error('Falha na operação', { description: (e as Error).message });
    } finally {
      setPending(false);
    }
  };

  if (editing) {
    return (
      <li className="rounded-2xl border border-gold/20 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-display text-lg text-white">Editar item</h4>
          <button
            onClick={() => setEditing(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:border-gold/40 hover:text-gold-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <EditItemForm item={item} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="group flex items-start gap-3 rounded-2xl border border-gold/10 bg-white/[0.02] p-4 transition hover:border-gold/20">
      {/* Reorder controls */}
      <div className="flex flex-col gap-0.5">
        <button
          disabled={isFirst || pending}
          onClick={() => busy(() => reorderItemAction(item.id, item.case_type_id, 'up'))}
          aria-label="Mover para cima"
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-white/40 transition hover:bg-white/5 hover:text-gold-100 disabled:opacity-20"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          disabled={isLast || pending}
          onClick={() => busy(() => reorderItemAction(item.id, item.case_type_id, 'down'))}
          aria-label="Mover para baixo"
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-white/40 transition hover:bg-white/5 hover:text-gold-100 disabled:opacity-20"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      {/* Category icon */}
      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-gold/20 bg-black/40">
        <CategoryIcon category={item.category} className="text-gold-100" />
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <h4 className="text-sm font-medium text-white">{item.title}</h4>
          {item.code && (
            <code className="rounded bg-white/[0.03] px-1.5 py-0.5 font-mono text-[0.55rem] tracking-wider text-white/40">
              {item.code}
            </code>
          )}
          <span className="text-[0.55rem] uppercase tracking-[0.25em] text-white/40">
            · {CATEGORY_LABELS[item.category]}
          </span>
        </div>
        {item.description && (
          <p className="mt-1 text-xs leading-relaxed text-white/55">
            {item.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.6rem] uppercase tracking-[0.25em] text-white/40">
          {!TEXT_ONLY_CATEGORIES.includes(item.category) && (
            <>
              <span>
                Formatos:{' '}
                {item.accepted_file_types.length === 0
                  ? '—'
                  : item.accepted_file_types.join(', ')}
              </span>
              <span>·</span>
              <span>
                {item.minimum_files === item.maximum_files
                  ? `${item.minimum_files} arquivo${item.minimum_files === 1 ? '' : 's'}`
                  : `${item.minimum_files}–${item.maximum_files} arquivos`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5">
        <button
          disabled={pending}
          onClick={() =>
            busy(() =>
              toggleRequiredAction(item.id, item.case_type_id, !item.required)
            )
          }
          className={
            item.required
              ? 'inline-flex h-8 items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100 transition hover:bg-gold/15'
              : 'inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 text-[0.55rem] uppercase tracking-[0.28em] text-white/50 transition hover:border-gold/30 hover:text-gold-100'
          }
        >
          {item.required ? (
            <ShieldCheck className="h-3 w-3" strokeWidth={1.5} />
          ) : (
            <Circle className="h-3 w-3" strokeWidth={1.5} />
          )}
          {item.required ? 'Obrigatório' : 'Opcional'}
        </button>

        <button
          onClick={() => setEditing(true)}
          aria-label="Editar"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:border-gold/40 hover:text-gold-100"
        >
          <Pencil className="h-3 w-3" strokeWidth={1.5} />
        </button>

        <button
          disabled={pending}
          onClick={async () => {
            const ok = await confirm({
              title: 'Remover item do checklist?',
              description: `"${item.title}" será removido deste tipo de caso.`,
              confirmLabel: 'Remover',
              tone: 'danger'
            });
            if (ok) busy(() => deleteTemplateItemAction(item.id, item.case_type_id));
          }}
          aria-label="Remover"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:border-rose-400/40 hover:bg-rose-400/10 hover:text-rose-200 disabled:opacity-50"
        >
          <Trash2 className="h-3 w-3" strokeWidth={1.5} />
        </button>
      </div>
    </li>
  );
}

function EditItemForm({
  item,
  onDone
}: {
  item: TemplateItem;
  onDone: () => void;
}) {
  const bound = updateTemplateItemAction.bind(null, item.id, item.case_type_id);
  const initial: ActionState = { ok: false };
  const [state, formAction] = useFormState(bound, initial);
  const [category, setCategory] = useState<ChecklistCategory>(item.category);
  const isTextOnly = TEXT_ONLY_CATEGORIES.includes(category);

  if (state.ok) setTimeout(onDone, 100);

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="case_type_id" value={item.case_type_id} />
      <div className="md:col-span-2">
        <Field label="Título" htmlFor="title">
          <Input id="title" name="title" defaultValue={item.title} required />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Descrição" htmlFor="description">
          <Input
            id="description"
            name="description"
            defaultValue={item.description ?? ''}
          />
        </Field>
      </div>
      <Field
        label="Código (opcional)"
        htmlFor="code"
        hint="Slug para auto-classificação futura"
      >
        <Input
          id="code"
          name="code"
          defaultValue={item.code ?? ''}
          pattern="[A-Z0-9_]*"
        />
      </Field>
      <Field label="Categoria" htmlFor="category">
        <select
          id="category"
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
      <Field label="Ordem" htmlFor="sort_order">
        <Input
          id="sort_order"
          name="sort_order"
          type="number"
          defaultValue={item.sort_order}
          min={0}
        />
      </Field>
      <div className="md:col-span-2">
        <label className="flex items-center gap-3 rounded-xl border border-gold/10 bg-white/[0.02] px-4 py-3 text-sm text-white/70">
          <input
            type="checkbox"
            name="required"
            defaultChecked={item.required}
            className="h-4 w-4 accent-[#C9A24B]"
          />
          <span className="text-white">Obrigatório</span>
        </label>
      </div>
      {!isTextOnly && (
        <>
          <div className="md:col-span-2">
            <Field
              label="Formatos aceitos"
              htmlFor="accepted_file_types"
              hint="Separe por vírgula. Ex.: stl, obj, pdf"
            >
              <Input
                id="accepted_file_types"
                name="accepted_file_types"
                defaultValue={item.accepted_file_types.join(', ')}
              />
            </Field>
          </div>
          <Field label="Mín. arquivos" htmlFor="minimum_files">
            <Input
              id="minimum_files"
              name="minimum_files"
              type="number"
              defaultValue={item.minimum_files}
              min={0}
            />
          </Field>
          <Field label="Máx. arquivos" htmlFor="maximum_files">
            <Input
              id="maximum_files"
              name="maximum_files"
              type="number"
              defaultValue={item.maximum_files}
              min={0}
            />
          </Field>
        </>
      )}
      {isTextOnly && (
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

      <div className="md:col-span-2">
        <SubmitBtn />
      </div>
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <Submit pending={pending}>Salvar item</Submit>;
}
