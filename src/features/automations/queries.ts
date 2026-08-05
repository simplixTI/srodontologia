import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AutomationRuleRow = {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  conditions: unknown[];
  actions: unknown[];
  enabled: boolean;
  priority: number;
  runs_count: number;
  last_run_at: string | null;
  created_at: string;
};

export async function listAutomationRules(): Promise<AutomationRuleRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('automation_rules')
    .select('id, name, description, trigger_event, conditions, actions, enabled, priority, runs_count, last_run_at, created_at')
    .order('priority')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AutomationRuleRow[];
}
