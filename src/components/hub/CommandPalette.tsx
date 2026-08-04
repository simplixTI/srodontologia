'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Briefcase, UserCircle2, Building2, Users, Command } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogOverlay
} from '@/components/ui/Dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { globalSearchAction, type SearchHit } from '@/features/search/actions';

const TYPE_ICON = {
  case: Briefcase,
  dentist: UserCircle2,
  clinic: Building2,
  lead: Users
};

const TYPE_LABEL: Record<SearchHit['type'], string> = {
  case: 'Caso',
  dentist: 'Dentista',
  clinic: 'Clínica',
  lead: 'Lead'
};

const QUICK_LINKS: { label: string; hint: string; href: string }[] = [
  { label: 'Novo caso', hint: 'Iniciar rascunho de caso clínico', href: '/casos/novo' },
  { label: 'Novo lead', hint: 'Adicionar prospect ao pipeline', href: '/leads/novo' },
  { label: 'Nova clínica', hint: 'Cadastrar clínica parceira', href: '/clinicas/nova' },
  { label: 'Novo dentista', hint: 'Adicionar dentista à base', href: '/dentistas/novo' },
  { label: 'Dashboard', hint: 'Visão executiva', href: '/dashboard' },
  { label: 'Casos', hint: 'Todos os casos abertos', href: '/casos' },
  { label: 'CRM · Pipeline', hint: 'Kanban comercial', href: '/leads' },
  { label: 'Checklists', hint: 'Templates de tipos de caso', href: '/checklists' }
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [pending, startTransition] = useTransition();
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setHits([]);
      setActiveIdx(0);
    } else {
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        try {
          const result = await globalSearchAction(query);
          setHits(result);
          setActiveIdx(0);
        } catch {
          setHits([]);
        }
      });
    }, 220);
  }, [query]);

  const showQuickLinks = query.trim().length < 2;
  const filteredQuicks = showQuickLinks
    ? QUICK_LINKS
    : QUICK_LINKS.filter((q) => q.label.toLowerCase().includes(query.trim().toLowerCase()));

  const list: (SearchHit | { quick: true; label: string; hint: string; href: string })[] =
    showQuickLinks ? filteredQuicks.map((q) => ({ quick: true, ...q })) : hits;

  const go = (item: SearchHit | { quick: true; href: string }) => {
    router.push(item.href);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[15%] z-[81] w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-3xl border border-gold/25 bg-black/95 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIdx((i) => Math.min(list.length - 1, i + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIdx((i) => Math.max(0, i - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const item = list[activeIdx];
              if (item) go(item as SearchHit);
            }
          }}
        >
          <DialogPrimitive.Title className="sr-only">Buscar no SR HUB</DialogPrimitive.Title>

          {/* Input */}
          <div className="flex items-center gap-3 border-b border-gold/10 px-4">
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin text-gold-100" strokeWidth={1.5} />
            ) : (
              <Search className="h-4 w-4 text-gold-100" strokeWidth={1.5} />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar casos, dentistas, clínicas, leads..."
              className="h-12 flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
            />
            <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[0.55rem] tracking-widest text-white/40">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto py-2">
            {showQuickLinks && (
              <div className="mb-1 px-4 pt-2 text-[0.55rem] uppercase tracking-[0.32em] text-white/35">
                Ações rápidas
              </div>
            )}
            {!showQuickLinks && hits.length === 0 && !pending && (
              <p className="p-6 text-center text-sm text-white/40">
                Nada encontrado para "<span className="text-white/60">{query}</span>"
              </p>
            )}

            {(showQuickLinks ? filteredQuicks : hits).map((item, i) => {
              const isQuick = 'quick' in (item as object) || showQuickLinks;
              const active = i === activeIdx;
              const key = isQuick
                ? `quick-${(item as { href: string }).href}`
                : `${(item as SearchHit).type}-${(item as SearchHit).id}`;

              if (isQuick) {
                const q = item as { label: string; hint: string; href: string };
                return (
                  <button
                    key={key}
                    onClick={() => go({ quick: true, href: q.href })}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={
                      'flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition ' +
                      (active ? 'bg-gold/10' : 'hover:bg-white/[0.03]')
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-lg border border-gold/20 bg-black/40">
                        <Command className="h-3 w-3 text-gold-100" strokeWidth={1.5} />
                      </div>
                      <div>
                        <div className="text-sm text-white">{q.label}</div>
                        <div className="text-[0.6rem] uppercase tracking-[0.25em] text-white/40">{q.hint}</div>
                      </div>
                    </div>
                    <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[0.5rem] tracking-widest text-white/30">
                      ↵
                    </kbd>
                  </button>
                );
              }

              const h = item as SearchHit;
              const Icon = TYPE_ICON[h.type];
              return (
                <button
                  key={key}
                  onClick={() => go(h)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={
                    'flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition ' +
                    (active ? 'bg-gold/10' : 'hover:bg-white/[0.03]')
                  }
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg border border-gold/20 bg-black/40">
                      <Icon className="h-3.5 w-3.5 text-gold-100" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-white">{h.title}</div>
                      {h.subtitle && (
                        <div className="truncate text-[0.6rem] uppercase tracking-[0.25em] text-white/40">
                          {h.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-gold/20 bg-gold/5 px-2 py-0.5 text-[0.5rem] uppercase tracking-[0.28em] text-gold-100">
                    {TYPE_LABEL[h.type]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-gold/10 bg-black/60 px-4 py-2 text-[0.55rem] uppercase tracking-[0.3em] text-white/40">
            <span>↑↓ navegar · ↵ abrir · ESC fechar · ⌘K alternar</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
