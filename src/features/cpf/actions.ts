'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertRateLimit } from '@/lib/rate-limit';
import { lookupCpf, type CpfLookupResult } from '@/lib/integrations/cpf/provider';

export type CpfActionResult =
  | { ok: true; data: CpfLookupResult }
  | { ok: false; error: string };

/**
 * Server action that resolves a CPF to identity data using the org's
 * configured CPF provider. Used by patient / dentist creation forms.
 *
 * Never returns the raw CPF in the response — only the identity fields.
 */
export async function lookupCpfAction(cpf: string): Promise<CpfActionResult> {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Não autenticado.' };

    assertRateLimit(`cpf:${user.id}`, { max: 30, windowMs: 60_000, label: 'Consultas CPF' });

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle<{ organization_id: string }>();
    if (!profile?.organization_id) return { ok: false, error: 'Organização não encontrada.' };

    const result = await lookupCpf(profile.organization_id, cpf);
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha na consulta.' };
  }
}
