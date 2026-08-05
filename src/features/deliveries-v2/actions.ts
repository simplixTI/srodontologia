'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { publishEvent } from '@/lib/events';
import {
  carrierSchema,
  driverSchema,
  extractCarrierForm,
  extractDriverForm,
  extractRouteForm,
  incidentSchema,
  manifestAddDeliverySchema,
  manifestCreateSchema,
  manifestTransitionSchema,
  routeSchema
} from '@/lib/validations/deliveries-v2';
import {
  addDeliveryToManifest,
  createCarrier,
  createDriver,
  createIncident,
  createManifest,
  createRoute,
  deleteCarrier,
  deleteDriver,
  deleteRoute,
  removeDeliveryFromManifest,
  resolveIncident,
  transitionManifest,
  updateCarrier,
  updateDriver,
  updateRoute
} from './service';

export type ActionState = { ok: boolean; error?: string; id?: string };

async function requireLogistics() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string; role: string }>();
  if (!profile) throw new Error('No profile');
  if (!['super_admin', 'admin', 'logistics'].includes(profile.role)) throw new Error('Forbidden');
  return { userId: user.id, orgId: profile.organization_id };
}

// ─── Driver actions ──────────────────────────────────────
export async function createDriverAction(
  _prev: ActionState | undefined,
  fd: FormData
): Promise<ActionState> {
  const raw = extractDriverForm(fd);
  const parsed = driverSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  try {
    const { orgId } = await requireLogistics();
    const d = await createDriver(orgId, parsed.data);
    revalidatePath('/entregas/motoristas');
    redirect(`/entregas/motoristas/${d.id}`);
  } catch (e) {
    if (e instanceof Error && !e.message.includes('NEXT_REDIRECT'))
      return { ok: false, error: e.message };
    throw e;
  }
  return { ok: true };
}

export async function updateDriverAction(id: string, patch: Record<string, unknown>): Promise<void> {
  await requireLogistics();
  const parsed = driverSchema.partial().safeParse(patch);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  await updateDriver(id, parsed.data);
  revalidatePath('/entregas/motoristas');
  revalidatePath(`/entregas/motoristas/${id}`);
}

export async function deleteDriverAction(id: string): Promise<void> {
  await requireLogistics();
  await deleteDriver(id);
  revalidatePath('/entregas/motoristas');
}

// ─── Carrier actions ─────────────────────────────────────
export async function createCarrierAction(
  _prev: ActionState | undefined,
  fd: FormData
): Promise<ActionState> {
  const raw = extractCarrierForm(fd);
  const parsed = carrierSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  try {
    const { orgId } = await requireLogistics();
    await createCarrier(orgId, parsed.data);
    revalidatePath('/entregas/transportadoras');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateCarrierAction(id: string, patch: Record<string, unknown>): Promise<void> {
  await requireLogistics();
  const parsed = carrierSchema.partial().safeParse(patch);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  await updateCarrier(id, parsed.data);
  revalidatePath('/entregas/transportadoras');
}

export async function deleteCarrierAction(id: string): Promise<void> {
  await requireLogistics();
  await deleteCarrier(id);
  revalidatePath('/entregas/transportadoras');
}

// ─── Route actions ───────────────────────────────────────
export async function createRouteAction(
  _prev: ActionState | undefined,
  fd: FormData
): Promise<ActionState> {
  const raw = extractRouteForm(fd);
  const parsed = routeSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  try {
    const { orgId } = await requireLogistics();
    await createRoute(orgId, parsed.data);
    revalidatePath('/entregas/rotas');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateRouteAction(id: string, patch: Record<string, unknown>): Promise<void> {
  await requireLogistics();
  const parsed = routeSchema.partial().safeParse(patch);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  await updateRoute(id, parsed.data);
  revalidatePath('/entregas/rotas');
}

export async function deleteRouteAction(id: string): Promise<void> {
  await requireLogistics();
  await deleteRoute(id);
  revalidatePath('/entregas/rotas');
}

// ─── Manifest actions ────────────────────────────────────
export async function createManifestAction(input: {
  route_id?: string | null;
  driver_id?: string | null;
  carrier_id?: string | null;
  notes?: string | null;
}): Promise<{ id: string }> {
  const parsed = manifestCreateSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  const { orgId } = await requireLogistics();
  const m = await createManifest(orgId, parsed.data);
  revalidatePath('/entregas/romaneios');
  return { id: m.id };
}

export async function transitionManifestAction(input: {
  manifest_id: string;
  target: 'ready' | 'dispatched' | 'in_transit' | 'completed' | 'cancelled';
}): Promise<void> {
  const parsed = manifestTransitionSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  const { userId, orgId } = await requireLogistics();
  const m = await transitionManifest(parsed.data.manifest_id, parsed.data.target);
  const evType =
    parsed.data.target === 'dispatched'
      ? 'delivery.dispatched'
      : parsed.data.target === 'completed'
        ? 'delivery.delivered'
        : 'delivery.dispatched';
  await publishEvent({
    organizationId: orgId,
    type: evType,
    aggregateType: 'delivery_manifest',
    aggregateId: m.id,
    actorId: userId,
    payload: { status: m.status, code: m.code }
  });
  revalidatePath(`/entregas/romaneios/${m.id}`);
  revalidatePath('/entregas/romaneios');
}

export async function addDeliveryToManifestAction(input: {
  manifest_id: string;
  delivery_id: string;
}): Promise<void> {
  const parsed = manifestAddDeliverySchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  const { orgId } = await requireLogistics();
  await addDeliveryToManifest(orgId, parsed.data.manifest_id, parsed.data.delivery_id);
  revalidatePath(`/entregas/romaneios/${parsed.data.manifest_id}`);
}

export async function removeDeliveryFromManifestAction(itemId: string, manifestId: string): Promise<void> {
  await requireLogistics();
  await removeDeliveryFromManifest(itemId);
  revalidatePath(`/entregas/romaneios/${manifestId}`);
}

// ─── Incident actions ────────────────────────────────────
export async function createIncidentAction(input: {
  delivery_id?: string | null;
  manifest_id?: string | null;
  severity: 'info' | 'warning' | 'error' | 'critical';
  kind: string;
  description: string;
}): Promise<void> {
  const parsed = incidentSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  const { orgId } = await requireLogistics();
  await createIncident(orgId, parsed.data);
  if (parsed.data.manifest_id) revalidatePath(`/entregas/romaneios/${parsed.data.manifest_id}`);
  revalidatePath('/entregas');
}

export async function resolveIncidentAction(id: string): Promise<void> {
  await requireLogistics();
  await resolveIncident(id);
  revalidatePath('/entregas');
}
