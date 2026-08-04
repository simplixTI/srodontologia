'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { caseTypeSchema } from '@/lib/validations/checklists';

export type ActionState = { ok: boolean; error?: string; id?: string };

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

  return { supabase, user, profile };
}

export async function createCaseTypeAction(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const parsed = caseTypeSchema.safeParse({
    code: formData.get('code'),
    name: formData.get('name'),
    description: formData.get('description'),
    icon: formData.get('icon'),
    active: formData.get('active') === 'on',
    sort_order: formData.get('sort_order')
  });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  try {
    const { supabase, user, profile } = await requireAdmin();
    const { data, error } = await supabase
      .from('case_types')
      .insert({
        organization_id: profile.organization_id,
        code: parsed.data.code,
        name: parsed.data.name,
        description: parsed.data.description || null,
        icon: parsed.data.icon || null,
        active: parsed.data.active,
        sort_order: parsed.data.sort_order,
        created_by: user.id
      } as never)
      .select('id')
      .single<{ id: string }>();

    if (error) {
      if (error.code === '23505')
        return { ok: false, error: 'Já existe um tipo de caso com esse código.' };
      return { ok: false, error: error.message };
    }

    revalidatePath('/checklists');
    redirect(`/checklists/${data!.id}`);
  } catch (e) {
    if (e instanceof Error && !e.message.includes('NEXT_REDIRECT'))
      return { ok: false, error: e.message };
    throw e;
  }
  return { ok: true };
}

export async function updateCaseTypeAction(
  id: string,
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const parsed = caseTypeSchema.safeParse({
    code: formData.get('code'),
    name: formData.get('name'),
    description: formData.get('description'),
    icon: formData.get('icon'),
    active: formData.get('active') === 'on',
    sort_order: formData.get('sort_order')
  });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from('case_types')
    .update({
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description || null,
      icon: parsed.data.icon || null,
      active: parsed.data.active,
      sort_order: parsed.data.sort_order
    } as never)
    .eq('id', id);

  if (error) {
    if (error.code === '23505')
      return { ok: false, error: 'Já existe outro tipo com esse código.' };
    return { ok: false, error: error.message };
  }

  revalidatePath('/checklists');
  revalidatePath(`/checklists/${id}`);
  return { ok: true, id };
}

export async function deleteCaseTypeAction(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from('case_types').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/checklists');
  redirect('/checklists');
}

export async function toggleCaseTypeActive(id: string, active: boolean) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from('case_types')
    .update({ active } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/checklists');
  revalidatePath(`/checklists/${id}`);
}
