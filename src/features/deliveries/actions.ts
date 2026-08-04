'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ActionState = { ok: boolean; error?: string };

async function requireInternal() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string; role: string }>();
  if (!profile) throw new Error('No profile');
  const allowed = ['super_admin', 'admin', 'logistics', 'production'];
  if (!allowed.includes(profile.role)) throw new Error('Forbidden');
  return { supabase, user, profile };
}

export async function createDeliveryAction(caseId: string, formData: FormData): Promise<ActionState> {
  const method = String(formData.get('method') ?? '').trim() || null;
  const carrier = String(formData.get('carrier') ?? '').trim() || null;
  const driver_name = String(formData.get('driver_name') ?? '').trim() || null;
  const tracking_code = String(formData.get('tracking_code') ?? '').trim() || null;
  const tracking_url = String(formData.get('tracking_url') ?? '').trim() || null;
  const recipient_name = String(formData.get('recipient_name') ?? '').trim() || null;
  const estimated_delivery_at = String(formData.get('estimated_delivery_at') ?? '').trim() || null;
  const status = String(formData.get('status') ?? 'preparing');

  const { supabase, profile } = await requireInternal();
  const { error } = await supabase.from('deliveries').insert({
    organization_id: profile.organization_id,
    case_id: caseId,
    status,
    method,
    carrier,
    driver_name,
    tracking_code,
    tracking_url,
    recipient_name,
    estimated_delivery_at: estimated_delivery_at || null
  } as never);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/casos/${caseId}`);
  return { ok: true };
}

export async function attachDeliveryReceiptAction(
  deliveryId: string,
  caseId: string,
  caseFileId: string
) {
  const { supabase } = await requireInternal();
  const { error } = await supabase
    .from('deliveries')
    .update({ receipt_file_id: caseFileId } as never)
    .eq('id', deliveryId);
  if (error) throw new Error(error.message);
  revalidatePath(`/casos/${caseId}`);
}

export async function updateDeliveryStatusAction(deliveryId: string, caseId: string, newStatus: string) {
  const { supabase } = await requireInternal();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'dispatched') patch.shipped_at = now;
  if (newStatus === 'delivered') patch.delivered_at = now;
  const { error } = await supabase.from('deliveries').update(patch as never).eq('id', deliveryId);
  if (error) throw new Error(error.message);
  revalidatePath(`/casos/${caseId}`);
}
