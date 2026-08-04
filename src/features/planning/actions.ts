'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ActionState = { ok: boolean; error?: string };

async function requireTechnical() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string; role: string }>();
  if (!profile) throw new Error('No profile');
  const allowed = ['super_admin', 'admin', 'technical_planning'];
  if (!allowed.includes(profile.role)) throw new Error('Forbidden');
  return { supabase, user, profile };
}

export async function createPlanningVersionAction(caseId: string, formData: FormData): Promise<ActionState> {
  const technical_description = String(formData.get('technical_description') ?? '').trim() || null;

  const { supabase, user, profile } = await requireTechnical();

  const { data: existing } = await supabase
    .from('planning_versions')
    .select('version_number')
    .eq('case_id', caseId)
    .order('version_number', { ascending: false })
    .limit(1);
  const nextVersion = ((existing?.[0] as { version_number: number } | undefined)?.version_number ?? 0) + 1;

  const { error } = await supabase.from('planning_versions').insert({
    organization_id: profile.organization_id,
    case_id: caseId,
    version_number: nextVersion,
    status: 'draft',
    technical_description,
    created_by: user.id
  } as never);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/casos/${caseId}`);
  return { ok: true };
}
