import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { randomBytes } from 'node:crypto';
import type {
  CarrierInput,
  DriverInput,
  RouteInput
} from '@/lib/validations/deliveries-v2';
import type { Carrier, Driver, Manifest, Route } from './types';

// ─── Drivers ──────────────────────────────────────────────
export async function createDriver(orgId: string, input: DriverInput): Promise<Driver> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('delivery_drivers')
    .insert({
      organization_id: orgId,
      profile_id: input.profile_id ?? null,
      full_name: input.full_name.trim(),
      phone: input.phone ?? null,
      document: input.document ?? null,
      vehicle_plate: input.vehicle_plate ?? null,
      vehicle_model: input.vehicle_model ?? null,
      status: input.status,
      notes: input.notes ?? null
    } as never)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Driver;
}

export async function updateDriver(id: string, patch: Partial<DriverInput>): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('delivery_drivers')
    .update({
      ...(patch.full_name !== undefined ? { full_name: patch.full_name.trim() } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone ?? null } : {}),
      ...(patch.document !== undefined ? { document: patch.document ?? null } : {}),
      ...(patch.vehicle_plate !== undefined ? { vehicle_plate: patch.vehicle_plate ?? null } : {}),
      ...(patch.vehicle_model !== undefined ? { vehicle_model: patch.vehicle_model ?? null } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes ?? null } : {})
    } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteDriver(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('delivery_drivers').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Carriers ─────────────────────────────────────────────
export async function createCarrier(orgId: string, input: CarrierInput): Promise<Carrier> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('delivery_carriers')
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      contact_name: input.contact_name ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      tracking_url_template: input.tracking_url_template ?? null,
      is_active: input.is_active
    } as never)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Carrier;
}

export async function updateCarrier(id: string, patch: Partial<CarrierInput>): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('delivery_carriers')
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.contact_name !== undefined ? { contact_name: patch.contact_name ?? null } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone ?? null } : {}),
      ...(patch.email !== undefined ? { email: patch.email ?? null } : {}),
      ...(patch.tracking_url_template !== undefined
        ? { tracking_url_template: patch.tracking_url_template ?? null }
        : {}),
      ...(patch.is_active !== undefined ? { is_active: patch.is_active } : {})
    } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteCarrier(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('delivery_carriers').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Routes ───────────────────────────────────────────────
export async function createRoute(orgId: string, input: RouteInput): Promise<Route> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('delivery_routes')
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      description: input.description ?? null,
      region: input.region ?? null,
      driver_id: input.driver_id ?? null,
      is_active: input.is_active
    } as never)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Route;
}

export async function updateRoute(id: string, patch: Partial<RouteInput>): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('delivery_routes')
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description ?? null } : {}),
      ...(patch.region !== undefined ? { region: patch.region ?? null } : {}),
      ...(patch.driver_id !== undefined ? { driver_id: patch.driver_id ?? null } : {}),
      ...(patch.is_active !== undefined ? { is_active: patch.is_active } : {})
    } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteRoute(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('delivery_routes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Manifests ────────────────────────────────────────────
export async function createManifest(
  orgId: string,
  input: {
    route_id?: string | null;
    driver_id?: string | null;
    carrier_id?: string | null;
    notes?: string | null;
  }
): Promise<Manifest> {
  const supabase = createSupabaseServerClient();
  const { data: codeResp, error: cErr } = await supabase.rpc('next_manifest_code', {
    p_org_id: orgId
  });
  if (cErr) throw new Error(cErr.message);
  const code = codeResp as string;
  const qrToken = randomBytes(24).toString('base64url');

  const { data, error } = await supabase
    .from('delivery_manifests')
    .insert({
      organization_id: orgId,
      code,
      route_id: input.route_id ?? null,
      driver_id: input.driver_id ?? null,
      carrier_id: input.carrier_id ?? null,
      status: 'draft',
      qr_token: qrToken,
      notes: input.notes ?? null
    } as never)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Manifest;
}

export async function transitionManifest(
  id: string,
  target: 'ready' | 'dispatched' | 'in_transit' | 'completed' | 'cancelled'
): Promise<Manifest> {
  const supabase = createSupabaseServerClient();
  const patch: Record<string, unknown> = { status: target };
  const now = new Date().toISOString();
  if (target === 'dispatched') patch.dispatched_at = now;
  if (target === 'completed') patch.completed_at = now;
  const { data, error } = await supabase
    .from('delivery_manifests')
    .update(patch as never)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Manifest;
}

export async function addDeliveryToManifest(orgId: string, manifestId: string, deliveryId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase
    .from('delivery_manifest_items')
    .select('position')
    .eq('manifest_id', manifestId)
    .order('position', { ascending: false })
    .limit(1);
  const nextPos = ((existing?.[0] as { position: number } | undefined)?.position ?? -10) + 10;
  const { error } = await supabase.from('delivery_manifest_items').insert({
    organization_id: orgId,
    manifest_id: manifestId,
    delivery_id: deliveryId,
    position: nextPos
  } as never);
  if (error) throw new Error(error.message);

  await supabase
    .from('deliveries')
    .update({ manifest_id: manifestId } as never)
    .eq('id', deliveryId);
}

export async function removeDeliveryFromManifest(itemId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: item } = await supabase
    .from('delivery_manifest_items')
    .select('delivery_id')
    .eq('id', itemId)
    .maybeSingle<{ delivery_id: string }>();
  const { error } = await supabase.from('delivery_manifest_items').delete().eq('id', itemId);
  if (error) throw new Error(error.message);
  if (item?.delivery_id) {
    await supabase
      .from('deliveries')
      .update({ manifest_id: null } as never)
      .eq('id', item.delivery_id);
  }
}

// ─── Incidents ────────────────────────────────────────────
export async function createIncident(
  orgId: string,
  input: {
    delivery_id?: string | null;
    manifest_id?: string | null;
    severity: 'info' | 'warning' | 'error' | 'critical';
    kind: string;
    description: string;
  }
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('delivery_incidents').insert({
    organization_id: orgId,
    delivery_id: input.delivery_id ?? null,
    manifest_id: input.manifest_id ?? null,
    severity: input.severity,
    kind: input.kind,
    description: input.description.trim(),
    reported_by: userData.user?.id ?? null
  } as never);
  if (error) throw new Error(error.message);
}

export async function resolveIncident(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('delivery_incidents')
    .update({ resolved_at: new Date().toISOString() } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
}
