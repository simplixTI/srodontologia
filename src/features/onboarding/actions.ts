'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { STEP_ORDER, type OnboardingStep } from './steps';

async function requireAdminInOrg() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string; role: string }>();
  if (!profile) throw new Error('Perfil não encontrado.');
  if (!['super_admin', 'admin'].includes(profile.role)) throw new Error('Apenas administradores.');
  return { supabase, user, profile };
}

export async function completeOnboardingStepAction(
  step: OnboardingStep
): Promise<{ ok: boolean; error?: string; nextStep?: OnboardingStep }> {
  try {
    const { supabase, profile } = await requireAdminInOrg();

    const { data: current } = await supabase
      .from('system_settings')
      .select('value')
      .eq('organization_id', profile.organization_id)
      .eq('key', 'onboarding_progress')
      .maybeSingle<{ value: { completed_steps?: string[]; current_step?: string } }>();

    const completed = new Set<string>(current?.value?.completed_steps ?? []);
    completed.add(step);

    const idx = STEP_ORDER.indexOf(step);
    const next = idx >= 0 && idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : 'done';

    await supabase.from('system_settings').upsert(
      {
        organization_id: profile.organization_id,
        key: 'onboarding_progress',
        value: {
          completed_steps: Array.from(completed),
          current_step: next,
          updated_at: new Date().toISOString()
        }
      },
      { onConflict: 'organization_id,key' }
    );

    revalidatePath('/onboarding');
    return { ok: true, nextStep: next };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}
