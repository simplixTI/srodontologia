import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type IntegrationKind = 'ai_provider' | 'ocr_provider' | 'cpf_provider' | 'whatsapp' | 'email' | 'webhook';

export type IntegrationRow = {
  id: string;
  organization_id: string;
  kind: IntegrationKind;
  provider: string;
  enabled: boolean;
  config: Record<string, unknown>;
  secret_ref: string | null;
};

/** Loads a single integration for an org+kind (null when not configured). */
export async function loadIntegration(
  organizationId: string,
  kind: IntegrationKind
): Promise<IntegrationRow | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('integration_settings')
    .select('id, organization_id, kind, provider, enabled, config, secret_ref')
    .eq('organization_id', organizationId)
    .eq('kind', kind)
    .maybeSingle();
  return (data as IntegrationRow | null) ?? null;
}

/** Reads secret from env by env-var name stored in secret_ref. */
export function readIntegrationSecret(integration: IntegrationRow | null): string | null {
  if (!integration?.secret_ref) return null;
  const val = process.env[integration.secret_ref];
  return val && val.length > 0 ? val : null;
}
