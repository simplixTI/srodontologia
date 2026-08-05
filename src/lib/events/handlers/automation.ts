import 'server-only';
import { registerEventHandler } from '../bus';
import { runAutomationRules } from '@/lib/automation/runner';

/**
 * Runs the automation engine against every published event.
 * The runner enqueues actions (email/whatsapp/webhook/notification/status_change)
 * — never executes them inline.
 */
export function registerAutomationHandler(): void {
  registerEventHandler(
    '.*' as `${string}.*`,
    async (event) => {
      await runAutomationRules(event);
    },
    'automationRunner'
  );
}
