import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  Carrier,
  DeliveryIncident,
  DeliveryKpis,
  Driver,
  Manifest,
  ManifestWithMeta,
  Route
} from './types';

// ─── Drivers ──────────────────────────────────────────────
export async function listDrivers(): Promise<Driver[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('delivery_drivers')
    .select('*')
    .order('status', { ascending: true })
    .order('full_name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Driver[];
}

export async function getDriver(id: string): Promise<Driver | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('delivery_drivers')
    .select('*')
    .eq('id', id)
    .maybeSingle<Driver>();
  if (error) throw new Error(error.message);
  return data;
}

// ─── Carriers ─────────────────────────────────────────────
export async function listCarriers(): Promise<Carrier[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('delivery_carriers')
    .select('*')
    .order('is_active', { ascending: false })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Carrier[];
}

// ─── Routes ───────────────────────────────────────────────
export async function listRoutes(): Promise<Route[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('delivery_routes')
    .select('*')
    .order('is_active', { ascending: false })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Route[];
}

// ─── Manifests ────────────────────────────────────────────
export async function listManifests(): Promise<ManifestWithMeta[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('delivery_manifests')
    .select(`
      *,
      driver:delivery_drivers ( full_name ),
      route:delivery_routes ( name ),
      carrier:delivery_carriers ( name ),
      delivery_manifest_items ( id )
    `)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    ...(r as unknown as Manifest),
    driver_name: (r.driver as { full_name?: string | null } | null)?.full_name ?? null,
    route_name: (r.route as { name?: string | null } | null)?.name ?? null,
    carrier_name: (r.carrier as { name?: string | null } | null)?.name ?? null,
    item_count: (r.delivery_manifest_items as Array<unknown> | null)?.length ?? 0
  }));
}

export async function getManifest(id: string): Promise<Manifest | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('delivery_manifests')
    .select('*')
    .eq('id', id)
    .maybeSingle<Manifest>();
  if (error) throw new Error(error.message);
  return data;
}

export async function listManifestDeliveries(manifestId: string): Promise<Array<{
  id: string;
  delivery_id: string;
  position: number;
  status: string;
  case_number: string | null;
  case_title: string | null;
  patient_initials: string | null;
  destination_address: string | null;
}>> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('delivery_manifest_items')
    .select(`
      id,
      delivery_id,
      position,
      deliveries!inner (
        status,
        destination_address,
        cases:cases!inner ( case_number, title, patients ( initials, patient_code ) )
      )
    `)
    .eq('manifest_id', manifestId)
    .order('position', { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => {
    const d = r.deliveries as {
      status?: string;
      destination_address?: string | null;
      cases?: {
        case_number?: string | null;
        title?: string | null;
        patients?: { initials?: string | null; patient_code?: string | null } | null;
      } | null;
    } | null;
    return {
      id: r.id as string,
      delivery_id: r.delivery_id as string,
      position: r.position as number,
      status: (d?.status as string) ?? '—',
      case_number: d?.cases?.case_number ?? null,
      case_title: d?.cases?.title ?? null,
      patient_initials: d?.cases?.patients?.initials ?? d?.cases?.patients?.patient_code ?? null,
      destination_address: d?.destination_address ?? null
    };
  });
}

// ─── Incidents ────────────────────────────────────────────
export async function listOpenIncidents(): Promise<DeliveryIncident[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('delivery_incidents')
    .select('*')
    .is('resolved_at', null)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DeliveryIncident[];
}

export async function getKpis(): Promise<DeliveryKpis | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('v_delivery_kpis')
    .select('*')
    .maybeSingle<DeliveryKpis>();
  if (error) throw new Error(error.message);
  return data;
}

export async function listPendingDeliveriesForManifest(): Promise<Array<{
  id: string;
  case_number: string | null;
  case_title: string | null;
  destination_address: string | null;
  status: string;
}>> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('deliveries')
    .select(`
      id,
      status,
      destination_address,
      manifest_id,
      cases:cases!inner ( case_number, title )
    `)
    .is('manifest_id', null)
    .in('status', ['pending', 'dispatched'])
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => {
    const c = r.cases as { case_number?: string | null; title?: string | null } | null;
    return {
      id: r.id as string,
      case_number: c?.case_number ?? null,
      case_title: c?.title ?? null,
      destination_address: (r.destination_address as string | null) ?? null,
      status: (r.status as string) ?? '—'
    };
  });
}
