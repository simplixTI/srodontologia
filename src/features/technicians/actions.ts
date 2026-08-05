'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  extractTechnicianForm,
  technicianSchema,
  skillSchema,
  type SkillLevel,
  type TechStatus
} from '@/lib/validations/production';
import {
  addSkill,
  createTechnician,
  deleteTechnician,
  removeSkill,
  updateStatus,
  updateTechnician
} from './service';

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
  if (!['super_admin', 'admin', 'technical_planning'].includes(profile.role))
    throw new Error('Forbidden');

  return { supabase, userId: user.id, orgId: profile.organization_id, role: profile.role };
}

export async function createTechnicianAction(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const raw = extractTechnicianForm(formData);
  const parsed = technicianSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  try {
    const { orgId } = await requireAdmin();
    const tech = await createTechnician(orgId, parsed.data);
    revalidatePath('/tecnicos');
    redirect(`/tecnicos/${tech.id}`);
  } catch (e) {
    if (e instanceof Error && !e.message.includes('NEXT_REDIRECT'))
      return { ok: false, error: e.message };
    throw e;
  }
  return { ok: true };
}

export async function updateTechnicianAction(id: string, patch: Record<string, unknown>): Promise<void> {
  await requireAdmin();
  const parsed = technicianSchema.partial().safeParse(patch);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  await updateTechnician(id, parsed.data);
  revalidatePath('/tecnicos');
  revalidatePath(`/tecnicos/${id}`);
}

export async function updateStatusAction(id: string, status: TechStatus): Promise<void> {
  await requireAdmin();
  await updateStatus(id, status);
  revalidatePath('/tecnicos');
  revalidatePath(`/tecnicos/${id}`);
}

export async function addSkillAction(technicianId: string, skill: string, level: SkillLevel): Promise<void> {
  await requireAdmin();
  const parsed = skillSchema.safeParse({ technician_id: technicianId, skill, level });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  await addSkill(technicianId, skill, level);
  revalidatePath(`/tecnicos/${technicianId}`);
}

export async function removeSkillAction(skillId: string, technicianId: string): Promise<void> {
  await requireAdmin();
  await removeSkill(skillId);
  revalidatePath(`/tecnicos/${technicianId}`);
}

export async function deleteTechnicianAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteTechnician(id);
  revalidatePath('/tecnicos');
}
