'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

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
