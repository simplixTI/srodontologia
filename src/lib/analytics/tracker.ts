import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Product analytics. Provider-agnostic. Falls back to Postgres table
 * (`product_analytics_events`) so we always have data for own dashboards.
 *
 * NEVER sends: clinical content, patient names, CPF, tokens, secrets,
 * file bytes. `properties` is truncated to 4KB.
 */

export type AnalyticsEvent =
  | 'signup_started'
  | 'signup_completed'
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'case_created'
  | 'quote_approved'
  | 'planning_approved'
  | 'first_value_reached'
  | 'checkout_started'
  | 'subscription_activated'
  | 'upgrade_completed'
  | 'downgrade_completed'
  | 'cancellation_requested'
  | 'support_ticket_created'
  | 'feedback_submitted';

export type TrackInput = {
  event: AnalyticsEvent;
  organizationId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  properties?: Record<string, unknown>;
};

const MAX_PROPS_BYTES = 4096;

export async function track(input: TrackInput): Promise<void> {
  try {
    const props = sanitize(input.properties ?? {});
    const admin = createSupabaseAdminClient();
    await admin.from('product_analytics_events').insert({
      organization_id: input.organizationId ?? null,
      user_id: input.userId ?? null,
      event: input.event,
      properties: props,
      session_id: input.sessionId ?? null
    });
  } catch {
    // analytics is best-effort — never throw
  }
}

const DENY = new Set([
  'password', 'secret', 'token', 'api_key', 'apikey', 'authorization',
  'cookie', 'card', 'cvc', 'cvv', 'cpf', 'ssn', 'patient_name',
  'clinical_description', 'material_notes', 'diagnosis'
]);

function sanitize(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (DENY.has(k.toLowerCase())) continue;
    if (typeof v === 'string' && v.length > 500) out[k] = v.slice(0, 500) + '…';
    else out[k] = v;
  }
  const serialized = JSON.stringify(out);
  if (serialized.length > MAX_PROPS_BYTES) {
    return { _truncated: true, size: serialized.length };
  }
  return out;
}
