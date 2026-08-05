'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertRateLimit } from '@/lib/rate-limit';

export type SmartSearchHit = {
  entity_type: 'case' | 'message' | 'patient' | 'dentist' | 'clinic';
  entity_id: string;
  title: string;
  snippet: string;
  rank: number;
  metadata: Record<string, unknown>;
};

export type SmartSearchResult =
  | { ok: true; query: string; hits: SmartSearchHit[] }
  | { ok: false; error: string };

/**
 * Full-text search over search_index (tsvector, Portuguese).
 * RLS enforces org scoping; websearch_to_tsquery accepts natural syntax.
 */
export async function smartSearchAction(
  rawQuery: string,
  opts: { limit?: number; entityType?: SmartSearchHit['entity_type'] | 'all' } = {}
): Promise<SmartSearchResult> {
  const q = (rawQuery ?? '').trim();
  if (q.length < 2) return { ok: true, query: q, hits: [] };
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Não autenticado.' };
    assertRateLimit(`smart-search:${user.id}`, { max: 60, windowMs: 60_000, label: 'Buscas' });

    const limit = Math.min(50, Math.max(5, opts.limit ?? 20));
    let query = supabase
      .from('search_index')
      .select('entity_type, entity_id, title, content, metadata')
      .textSearch('tokens', q, { config: 'portuguese', type: 'websearch' })
      .limit(limit);

    if (opts.entityType && opts.entityType !== 'all') query = query.eq('entity_type', opts.entityType);

    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };

    const hits: SmartSearchHit[] = (data ?? []).map((r, i) => ({
      entity_type: r.entity_type as SmartSearchHit['entity_type'],
      entity_id: r.entity_id as string,
      title: (r.title as string) ?? '(sem título)',
      snippet: excerptAround(r.content as string, q, 200),
      rank: 1 - i / limit,
      metadata: (r.metadata as Record<string, unknown>) ?? {}
    }));
    return { ok: true, query: q, hits };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha na busca.' };
  }
}

function excerptAround(content: string, query: string, radius: number): string {
  if (!content) return '';
  const term = query.split(/\s+/)[0]?.toLowerCase() ?? '';
  const lower = content.toLowerCase();
  const idx = term ? lower.indexOf(term) : -1;
  if (idx === -1) return content.slice(0, radius);
  const start = Math.max(0, idx - Math.floor(radius / 2));
  const end = Math.min(content.length, start + radius);
  return (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '');
}

export type SearchHit = {
  id: string;
  type: 'case' | 'dentist' | 'clinic' | 'lead';
  title: string;
  subtitle?: string;
  href: string;
};

/** Global search across cases, dentists, clinics, leads with RLS applied. */
export async function globalSearchAction(rawTerm: string): Promise<SearchHit[]> {
  const term = rawTerm.trim();
  if (term.length < 2) return [];
  const like = `%${term}%`;

  const supabase = createSupabaseServerClient();

  const [casesRes, dentistsRes, clinicsRes, leadsRes] = await Promise.all([
    supabase
      .from('cases')
      .select('id, case_number, title')
      .is('archived_at', null)
      .or(`case_number.ilike.${like},title.ilike.${like}`)
      .limit(6),
    supabase
      .from('dentists')
      .select('id, full_name, specialty, cro_state, cro_number')
      .is('archived_at', null)
      .or(`full_name.ilike.${like},cro_number.ilike.${like}`)
      .limit(6),
    supabase
      .from('clinics')
      .select('id, trade_name, city')
      .is('archived_at', null)
      .ilike('trade_name', like)
      .limit(6),
    supabase
      .from('leads')
      .select('id, full_name, clinic_name, pipeline_stage')
      .is('archived_at', null)
      .or(`full_name.ilike.${like},clinic_name.ilike.${like}`)
      .limit(6)
  ]);

  const hits: SearchHit[] = [];

  for (const c of (casesRes.data ?? []) as { id: string; case_number: string; title: string }[]) {
    hits.push({
      id: c.id,
      type: 'case',
      title: `${c.case_number} · ${c.title}`,
      href: `/casos/${c.id}`
    });
  }
  for (const d of (dentistsRes.data ?? []) as {
    id: string;
    full_name: string;
    specialty: string | null;
    cro_state: string | null;
    cro_number: string | null;
  }[]) {
    hits.push({
      id: d.id,
      type: 'dentist',
      title: d.full_name,
      subtitle: [
        [d.cro_state, d.cro_number].filter(Boolean).join('-'),
        d.specialty
      ]
        .filter(Boolean)
        .join(' · '),
      href: `/dentistas/${d.id}`
    });
  }
  for (const c of (clinicsRes.data ?? []) as { id: string; trade_name: string; city: string | null }[]) {
    hits.push({
      id: c.id,
      type: 'clinic',
      title: c.trade_name,
      subtitle: c.city ?? undefined,
      href: `/clinicas/${c.id}`
    });
  }
  for (const l of (leadsRes.data ?? []) as {
    id: string;
    full_name: string;
    clinic_name: string | null;
    pipeline_stage: string;
  }[]) {
    hits.push({
      id: l.id,
      type: 'lead',
      title: l.full_name,
      subtitle: l.clinic_name ?? undefined,
      href: `/leads/${l.id}`
    });
  }

  return hits;
}
