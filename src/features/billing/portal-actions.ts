'use server';

import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  startCheckoutForOrg,
  openCustomerPortal as openPortal,
  changePlan as changePlanSvc,
  cancelForOrg
} from '@/lib/billing/service';

export type CheckoutState = { ok: true; url: string } | { ok: false; error: string };
export type ActionState = { ok: boolean; error?: string; url?: string };

async function requireBillingAdmin() {
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

const checkoutSchema = z.object({
  plan_code: z.string().min(2).max(40),
  cycle: z.enum(['monthly', 'yearly'])
});

export async function checkoutAction(input: unknown): Promise<CheckoutState> {
  try {
    const parsed = checkoutSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    const { profile } = await requireBillingAdmin();
    const app = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await startCheckoutForOrg({
      organizationId: profile.organization_id,
      planCode: parsed.data.plan_code,
      cycle: parsed.data.cycle,
      successUrl: `${app}/billing/success`,
      cancelUrl: `${app}/billing`
    });
    return { ok: true, url: res.url };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha no checkout.' };
  }
}

export async function openCustomerPortalAction(): Promise<ActionState> {
  try {
    const { profile } = await requireBillingAdmin();
    const app = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const url = await openPortal({
      organizationId: profile.organization_id,
      returnUrl: `${app}/billing`
    });
    return { ok: true, url };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Portal indisponível.' };
  }
}

const changeSchema = z.object({
  plan_code: z.string().min(2).max(40),
  cycle: z.enum(['monthly', 'yearly'])
});

export async function changePlanAction(input: unknown): Promise<ActionState> {
  try {
    const parsed = changeSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: 'Dados inválidos.' };
    const { profile } = await requireBillingAdmin();
    await changePlanSvc({
      organizationId: profile.organization_id,
      planCode: parsed.data.plan_code,
      cycle: parsed.data.cycle
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha ao trocar plano.' };
  }
}

export async function cancelAtPeriodEndAction(): Promise<ActionState> {
  try {
    const { profile } = await requireBillingAdmin();
    await cancelForOrg({ organizationId: profile.organization_id, atPeriodEnd: true });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}
