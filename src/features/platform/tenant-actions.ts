'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requirePlatformUser } from '@/lib/permissions/platform';

export type ActionState = { ok: boolean; error?: string };

export async function suspendTenantAction(tenantId: string, reason: string): Promise<ActionState> {
  try {
    const parsed = z.object({ tenantId: z.string().uuid(), reason: z.string().min(3).max(500) }).safeParse({ tenantId, reason });
    if (!parsed.success) return { ok: false, error: 'Dados inválidos.' };
    await requirePlatformUser();

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from('organizations')
      .update({
        subscription_status: 'suspended',
        suspended_at: new Date().toISOString(),
        suspended_reason: reason
      })
      .eq('id', tenantId);
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/super-admin/tenants/${tenantId}`);
    revalidatePath('/super-admin/tenants');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro.' };
  }
}

export async function reactivateTenantAction(tenantId: string): Promise<ActionState> {
  try {
    await requirePlatformUser();
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from('organizations')
      .update({
        subscription_status: 'active',
        suspended_at: null,
        suspended_reason: null
      })
      .eq('id', tenantId);
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/super-admin/tenants/${tenantId}`);
    revalidatePath('/super-admin/tenants');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro.' };
  }
}

export async function changeTenantPlanAction(tenantId: string, planId: string): Promise<ActionState> {
  try {
    const parsed = z.object({ tenantId: z.string().uuid(), planId: z.string().uuid() }).safeParse({ tenantId, planId });
    if (!parsed.success) return { ok: false, error: 'Dados inválidos.' };
    const platformUser = await requirePlatformUser();

    const admin = createSupabaseAdminClient();

    const { data: current } = await admin
      .from('organizations')
      .select('plan_id')
      .eq('id', tenantId)
      .maybeSingle<{ plan_id: string | null }>();

    const { error: orgErr } = await admin
      .from('organizations')
      .update({ plan_id: planId })
      .eq('id', tenantId);
    if (orgErr) return { ok: false, error: orgErr.message };

    // Cria evento de auditoria + atualiza subscription atual se houver
    const { data: sub } = await admin
      .from('subscriptions')
      .select('id')
      .eq('organization_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (sub) {
      await admin.from('subscriptions').update({ plan_id: planId }).eq('id', sub.id);
      await admin.from('subscription_events').insert({
        subscription_id: sub.id,
        organization_id: tenantId,
        event_type: 'plan_changed',
        from_plan_id: current?.plan_id ?? null,
        to_plan_id: planId,
        actor_id: platformUser.id,
        metadata: { by: 'platform_admin' }
      });
    }

    revalidatePath(`/super-admin/tenants/${tenantId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro.' };
  }
}
