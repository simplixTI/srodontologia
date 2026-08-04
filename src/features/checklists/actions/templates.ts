'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { templateItemSchema } from '@/lib/validations/checklists';

export type ActionState = { ok: boolean; error?: string };

async function requireAdmin() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string; role: string }>();

  if (!profile) throw new Error('No profile');
  if (!['super_admin', 'admin'].includes(profile.role))
    throw new Error('Forbidden');

  return { supabase, profile };
}

function extractForm(formData: FormData) {
  return {
    case_type_id: formData.get('case_type_id'),
    code: formData.get('code'),
    title: formData.get('title'),
    description: formData.get('description'),
    category: formData.get('category'),
    required: formData.get('required') === 'on',
    sort_order: formData.get('sort_order') ?? 0,
    accepted_file_types: (formData.get('accepted_file_types') as string) ?? '',
    minimum_files: formData.get('minimum_files') ?? 0,
    maximum_files: formData.get('maximum_files') ?? 0
  };
}

export async function createTemplateItemAction(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const parsed = templateItemSchema.safeParse(extractForm(formData));
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  const { supabase, profile } = await requireAdmin();
  const { error } = await supabase.from('case_checklist_templates').insert({
    organization_id: profile.organization_id,
    case_type_id: parsed.data.case_type_id,
    code: parsed.data.code || null,
    title: parsed.data.title,
    description: parsed.data.description || null,
    category: parsed.data.category,
    required: parsed.data.required,
    sort_order: parsed.data.sort_order,
    accepted_file_types: parsed.data.accepted_file_types,
    minimum_files: parsed.data.minimum_files,
    maximum_files: parsed.data.maximum_files
  } as never);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/checklists/${parsed.data.case_type_id}`);
  return { ok: true };
}

export async function updateTemplateItemAction(
  id: string,
  caseTypeId: string,
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const parsed = templateItemSchema.safeParse(extractForm(formData));
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from('case_checklist_templates')
    .update({
      code: parsed.data.code || null,
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category,
      required: parsed.data.required,
      sort_order: parsed.data.sort_order,
      accepted_file_types: parsed.data.accepted_file_types,
      minimum_files: parsed.data.minimum_files,
      maximum_files: parsed.data.maximum_files
    } as never)
    .eq('id', id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/checklists/${caseTypeId}`);
  return { ok: true };
}

export async function deleteTemplateItemAction(id: string, caseTypeId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from('case_checklist_templates')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/checklists/${caseTypeId}`);
}

export async function toggleRequiredAction(id: string, caseTypeId: string, required: boolean) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from('case_checklist_templates')
    .update({ required } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/checklists/${caseTypeId}`);
}

export async function reorderItemAction(
  id: string,
  caseTypeId: string,
  direction: 'up' | 'down'
) {
  const { supabase } = await requireAdmin();

  const { data: items, error: fetchError } = await supabase
    .from('case_checklist_templates')
    .select('id, sort_order')
    .eq('case_type_id', caseTypeId)
    .order('sort_order', { ascending: true });

  if (fetchError) throw new Error(fetchError.message);
  const list = (items ?? []) as { id: string; sort_order: number }[];
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return;

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= list.length) return;

  const a = list[idx];
  const b = list[swapIdx];

  await supabase
    .from('case_checklist_templates')
    .update({ sort_order: b.sort_order } as never)
    .eq('id', a.id);
  await supabase
    .from('case_checklist_templates')
    .update({ sort_order: a.sort_order } as never)
    .eq('id', b.id);

  revalidatePath(`/checklists/${caseTypeId}`);
}
