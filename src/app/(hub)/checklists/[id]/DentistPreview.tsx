import { Circle, ShieldCheck } from 'lucide-react';
import type { TemplateItem } from '@/features/checklists/queries';
import { CategoryIcon } from '@/components/hub/checklists/CategoryIcon';
import { TEXT_ONLY_CATEGORIES } from '@/lib/validations/checklists';

export function DentistPreview({
  caseTypeName,
  items
}: {
  caseTypeName: string;
  items: TemplateItem[];
}) {
  const required = items.filter((x) => x.required).length;

  return (
    <div className="rounded-3xl border border-gold/15 bg-black/60 p-6 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-300" />
        <span className="text-[0.55rem] uppercase tracking-[0.32em] text-gold-100">
          Prévia — portal do dentista
        </span>
      </div>

      <h3 className="mt-4 font-display text-xl text-white">
        Novo caso · {caseTypeName}
      </h3>
      <p className="mt-1 text-[0.7rem] text-white/50">
        {items.length} itens · {required} obrigatórios
      </p>

      {/* Progress simulation */}
      <div className="mt-5">
        <div className="flex justify-between text-[0.55rem] uppercase tracking-[0.3em] text-white/40">
          <span>0% concluído</span>
          <span>0 / {required}</span>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/5">
          <div className="h-full w-0 bg-gold-gradient" />
        </div>
      </div>

      <ul className="mt-6 space-y-2">
        {items.length === 0 && (
          <li className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center text-xs text-white/40">
            Adicione itens para preview
          </li>
        )}
        {items.map((it) => (
          <li
            key={it.id}
            className={
              it.required
                ? 'flex items-center gap-3 rounded-xl border border-rose-400/25 bg-rose-400/5 p-3'
                : 'flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3'
            }
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/40">
              <CategoryIcon
                category={it.category}
                className={it.required ? 'text-rose-200' : 'text-white/60'}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-white">
                {it.title}
              </div>
              <div className="text-[0.55rem] uppercase tracking-[0.25em] text-white/40">
                {TEXT_ONLY_CATEGORIES.includes(it.category)
                  ? 'texto'
                  : it.accepted_file_types.join(' · ') || 'qualquer'}
              </div>
            </div>
            {it.required ? (
              <ShieldCheck
                className="h-3.5 w-3.5 text-rose-300/80"
                strokeWidth={1.5}
              />
            ) : (
              <Circle className="h-3.5 w-3.5 text-white/30" strokeWidth={1.5} />
            )}
          </li>
        ))}
      </ul>

      {required > 0 && (
        <div className="mt-6 rounded-xl border border-rose-400/25 bg-rose-400/5 p-3 text-[0.65rem] leading-relaxed text-rose-200/90">
          Faltam informações obrigatórias para prosseguir.
        </div>
      )}

      <button
        disabled
        className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-[0.65rem] uppercase tracking-[0.24em] text-white/40"
      >
        Enviar caso (bloqueado)
      </button>
    </div>
  );
}
