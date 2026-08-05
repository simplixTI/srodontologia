export type OnboardingStep =
  | 'company'
  | 'branding'
  | 'team'
  | 'clinic'
  | 'first_case'
  | 'integrations'
  | 'done';

export const STEP_ORDER: OnboardingStep[] = [
  'company',
  'branding',
  'team',
  'clinic',
  'first_case',
  'integrations',
  'done'
];
