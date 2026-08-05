import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  PlanningActivity,
  PlanningChecklistItem,
  PlanningComment,
  PlanningStatus,
  PlanningTemplate,
  PlanningTemplateItem,
  PlanningVersion,
  PlanningVersionWithCase
} from './types';

export async function listCasePlanning(caseId: string): Promise<PlanningVersion[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('planning_versions')
    .select('*')
    .eq('case_id', caseId)
    .order('version_number', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PlanningVersion[];
}

export async function getVersion(id: string): Promise<PlanningVersion | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('planning_versions')
    .select('*')
    .eq('id', id)
    .maybeSingle<PlanningVersion>();
  if (error) throw new Error(error.message);
  return data;
}

export async function listVersionsWithCase(
  filter?: { status?: PlanningStatus }
): Promise<PlanningVersionWithCase[]> {
  const supabase = createSupabaseServerClient();
  let q = supabase
    .from('planning_versions')
    .select(`
      *,
      cases:cases!inner (
        case_number,
        title,
        patients ( initials, patient_code ),
        dentists ( full_name )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(200);
  if (filter?.status) q = q.eq('status', filter.status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => {
    const c = r.cases as {
      case_number?: string | null;
      title?: string | null;
      patients?: { initials?: string | null; patient_code?: string | null } | null;
      dentists?: { full_name?: string | null } | null;
    } | null;
    return {
      ...(r as unknown as PlanningVersion),
      case_number: c?.case_number ?? null,
      case_title: c?.title ?? null,
      dentist_name: c?.dentists?.full_name ?? null,
      patient_initials: c?.patients?.initials ?? c?.patients?.patient_code ?? null
    } satisfies PlanningVersionWithCase;
  });
}

// ─── Templates ────────────────────────────────────────────
export async function listTemplates(): Promise<PlanningTemplate[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('planning_templates')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PlanningTemplate[];
}

export async function getTemplate(id: string): Promise<PlanningTemplate | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('planning_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle<PlanningTemplate>();
  if (error) throw new Error(error.message);
  return data;
}

export async function listTemplateItems(templateId: string): Promise<PlanningTemplateItem[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('planning_template_items')
    .select('*')
    .eq('template_id', templateId)
    .order('position', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PlanningTemplateItem[];
}

// ─── Checklist ────────────────────────────────────────────
export async function listChecklistItems(versionId: string): Promise<PlanningChecklistItem[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('planning_checklist_items')
    .select('*')
    .eq('planning_version_id', versionId)
    .order('position', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PlanningChecklistItem[];
}

// ─── Comments ─────────────────────────────────────────────
export async function listComments(versionId: string): Promise<PlanningComment[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('planning_comments')
    .select(`
      *,
      author:profiles!planning_comments_author_id_fkey ( full_name )
    `)
    .eq('planning_version_id', versionId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    ...(r as unknown as PlanningComment),
    author_name: (r.author as { full_name?: string | null } | null)?.full_name ?? null
  }));
}

// ─── Activity ─────────────────────────────────────────────
export async function getVersionActivity(versionId: string): Promise<PlanningActivity | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('v_planning_activity')
    .select('*')
    .eq('version_id', versionId)
    .maybeSingle<PlanningActivity>();
  if (error) throw new Error(error.message);
  return data;
}
