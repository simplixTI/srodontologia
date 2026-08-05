'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { smartSearchAction, type SmartSearchHit } from '@/features/search/actions';

const TYPES: { value: 'all' | SmartSearchHit['entity_type']; label: string }[] = [
  { value: 'all',      label: 'Tudo' },
  { value: 'case',     label: 'Casos' },
  { value: 'message',  label: 'Mensagens' },
  { value: 'patient',  label: 'Pacientes' },
  { value: 'dentist',  label: 'Dentistas' },
  { value: 'clinic',   label: 'Clínicas' }
];

export function SmartSearch() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<(typeof TYPES)[number]['value']>('all');
  const [hits, setHits] = useState<SmartSearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const debounced = useDebounced(query, 250);

  useEffect(() => {
    if (debounced.trim().length < 2) {
      setHits([]);
      return;
    }
    start(async () => {
      const res = await smartSearchAction(debounced, { entityType: type });
      if (!res.ok) {
        setError(res.error);
        setHits([]);
        return;
      }
      setError(null);
      setHits(res.hits);
    });
  }, [debounced, type]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Digite pelo menos 2 caracteres…"
          autoFocus
          className="h-10 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as (typeof TYPES)[number]['value'])}
          className="h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-xl border border-red-400/30 bg-red-400/5 p-3 text-xs text-red-200">{error}</p>
      )}

      <ul className="flex flex-col gap-2">
        {hits.map((h) => (
          <li key={`${h.entity_type}:${h.entity_id}`}>
            <HitRow hit={h} />
          </li>
        ))}
        {hits.length === 0 && query.length >= 2 && !pending && (
          <li className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center text-xs text-white/50">
            Nenhum resultado.
          </li>
        )}
      </ul>
    </div>
  );
}

function HitRow({ hit }: { hit: SmartSearchHit }) {
  const href = linkFor(hit);
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-gold/10 bg-white/[0.02] p-4 transition hover:border-gold/30"
    >
      <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/40">{hit.entity_type}</div>
      <div className="mt-1 text-sm text-white">{hit.title}</div>
      {hit.snippet && <p className="mt-2 text-xs text-white/60">{hit.snippet}</p>}
    </Link>
  );
}

function linkFor(h: SmartSearchHit): string {
  switch (h.entity_type) {
    case 'case':     return `/casos/${h.entity_id}`;
    case 'message':  return `/casos/${(h.metadata.case_id as string) ?? h.entity_id}?tab=chat`;
    case 'dentist':  return `/dentistas/${h.entity_id}`;
    case 'clinic':   return `/clinicas/${h.entity_id}`;
    case 'patient':  return `/casos?patient=${h.entity_id}`;
    default:         return '#';
  }
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return useMemo(() => v, [v]);
}
