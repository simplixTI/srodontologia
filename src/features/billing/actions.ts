'use server';

import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolvePlatformBillingProvider, activateSubscription } from '@/lib/billing/registry';

export type CheckoutState =
  | { ok: true; hostedUrl: string }
  | { ok: false; error: string };

async function requireAdminInOrg() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role, email')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string; role: string; email: string }>();
  if (!profile) throw new Error('Perfil não encontrado.');
  if (!['super_admin', 'admin', 'finance'].includes(profile.role)) throw new Error('Acesso negado.');
  return { supabase, user, profile };
}

const schema = z.object({
  plan_code: z.string().min(2).max(40),
  cycle: z.enum(['monthly', 'yearly'])
});

export async function startCheckoutAction(input: unknown): Promise<CheckoutState> {
  try {
    const parsed = schema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    const { profile } = await requireAdminInOrg();

    const provider = await resolvePlatformBillingProvider();
    const result = await provider.createCheckout({
      organizationId: profile.organization_id,
      planCode: parsed.data.plan_code,
      cycle: parsed.data.cycle,
      customerEmail: profile.email,
      successUrl: `${baseUrl()}/billing/success`,
      cancelUrl: `${baseUrl()}/billing`
    });

    if (!result.hostedUrl) return { ok: false, error: 'Provider não retornou URL.' };

    // Mock provider auto-confirms — activate immediately.
    if (result.provider === 'mock' && result.externalRef) {
      await activateSubscription({
        organizationId: profile.organization_id,
        planCode: parsed.data.plan_code,
        cycle: parsed.data.cycle,
        externalRef: result.externalRef,
        provider: 'mock'
      });
    }

    return { ok: true, hostedUrl: result.hostedUrl };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha no checkout.' };
  }
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}
