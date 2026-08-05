'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { addTemplateItemAction, removeTemplateItemAction } from '@/features/planning/actions';
import type { PlanningTemplateItem } from '@/features/planning/types';

type Props = { templateId: string; initialItems: PlanningTemplateItem[] };

export function TemplateItemsPanel({ templateId, initialItems }: Props) {
  const [items, setItems] = useState<PlanningTemplateItem[]>(initialItems);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [required, setRequired] = useState(true);
  const [pending, startTransition] = useTransition();

  function add() {
    if (!label.trim()) return;
    startTransition(async () => {
      try {
        const nextPos = (items[items.length - 1]?.position ?? -10) + 10;
        await addTemplateItemAction({
          template_id: templateId,
          label: label.trim(),
          description: description.trim() || null,
          position: nextPos,
          is_required: required
        });
        setLabel('');
        setDescription('');
        toast.success('Item adicionado');
        location.reload();
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  function remove(id: string) {
    if (!confirm('Remover este item?')) return;
    startTransition(async () => {
      try {
        await removeTemplateItemAction(id, templateId);
        setItems((s) => s.filter((x) => x.id !== id));
        toast.success('Removido');
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  return (
    <section className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
      <h2 className="mb-3 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">
        Itens do checklist ({items.length})
      </h2>

      {items.length === 0 ? (
        <div className="mb-4 text-sm text-white/40">
          Adicione itens para que sejam copiados automaticamente para novas versões que usem este template.
        </div>
      ) : (
        <ul className="mb-4 space-y-1">
          {items.map((i, idx) => (
            <li
              key={i.id}
              className="flex items-start gap-3 rounded-xl border border-gold/5 bg-black/20 px-3 py-2"
            >
              <span className="mt-0.5 font-mono text-[0.55rem] text-white/40">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white">{i.label}</div>
                {i.description && <div className="text-[0.6rem] text-white/40">{i.description}</div>}
                {i.is_required && (
                  <span className="text-[0.55rem] uppercase tracking-[0.2em] text-amber-200">
                    obrigatório
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(i.id)}
                className="text-red-300/60 hover:text-red-300"
                aria-label="Remover"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Novo item (ex: Verificar oclusão)"
          className="input-dark h-9 rounded-xl px-3 text-sm"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição opcional"
          className="input-dark h-9 rounded-xl px-3 text-sm"
        />
        <div className="flex items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/40 accent-gold-300"
            />
            Obrigatório
          </label>
          <button
            type="button"
            onClick={add}
            disabled={pending || !label.trim()}
            className="btn-gold inline-flex h-9 items-center gap-2 rounded-full px-4 text-[0.65rem] uppercase tracking-[0.22em]"
          >
            <Plus className="h-3 w-3" strokeWidth={2} /> Adicionar
          </button>
        </div>
      </div>
    </section>
  );
}
