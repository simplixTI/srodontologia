import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { OnboardingStep } from './actions';

export type OnboardingProgress = {
  completed_steps: OnboardingStep[];
  current_step: OnboardingStep;
};

export async function getOnboardingProgress(): Promise<OnboardingProgress> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { completed_steps: [], current_step: 'company' };
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string }>();
  if (!profile?.organization_id) return { completed_steps: [], current_step: 'company' };

  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('organization_id', profile.organization_id)
    .eq('key', 'onboarding_progress')
    .maybeSingle<{ value: OnboardingProgress }>();
  return data?.value ?? { completed_steps: [], current_step: 'company' };
}
