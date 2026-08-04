import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ChecklistCategory } from '@/lib/validations/checklists';

export type CaseType = {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  active: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TemplateItem = {
  id: string;
  organization_id: string;
  case_type_id: string;
  code: string | null;
  title: string;
  description: string | null;
  category: ChecklistCategory;
  required: boolean;
  sort_order: number;
  accepted_file_types: string[];
  minimum_files: number;
  maximum_files: number;
  created_at: string;
  updated_at: string;
};

export async function listCaseTypesWithCounts() {
  const supabase = createSupabaseServerClient();

  const [{ data: types, error: typesError }, { data: items, error: itemsError }] =
    await Promise.all([
      supabase
        .from('case_types')
        .select('id, code, name, description, icon, active, sort_order, updated_at')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase.from('case_checklist_templates').select('case_type_id, required')
    ]);

  if (typesError) throw new Error(typesError.message);
  if (itemsError) throw new Error(itemsError.message);

  const counts = new Map<string, { total: number; required: number }>();
  for (const it of items ?? []) {
    const row = it as { case_type_id: string; required: boolean };
    const c = counts.get(row.case_type_id) ?? { total: 0, required: 0 };
    c.total += 1;
    if (row.required) c.required += 1;
    counts.set(row.case_type_id, c);
  }

  return (types ?? []).map((t) => ({
    ...(t as Omit<CaseType, 'organization_id' | 'created_by' | 'created_at'>),
    total_items: counts.get((t as { id: string }).id)?.total ?? 0,
    required_items: counts.get((t as { id: string }).id)?.required ?? 0
  }));
}

export async function getCaseType(id: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('case_types')
    .select('*')
    .eq('id', id)
    .maybeSingle<CaseType>();
  if (error) throw new Error(error.message);
  return data;
}

export async function listTemplatesForCaseType(caseTypeId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('case_checklist_templates')
    .select('*')
    .eq('case_type_id', caseTypeId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TemplateItem[];
}
