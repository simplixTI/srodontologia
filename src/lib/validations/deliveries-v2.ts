import { z } from 'zod';

// ─── Driver ───────────────────────────────────────────────
export const driverSchema = z.object({
  full_name: z.string().min(2).max(120),
  phone: z.string().max(40).optional().nullable(),
  document: z.string().max(30).optional().nullable(),
  vehicle_plate: z.string().max(20).optional().nullable(),
  vehicle_model: z.string().max(80).optional().nullable(),
  status: z.enum(['active', 'inactive', 'vacation', 'on_leave']).default('active'),
  profile_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable()
});
export type DriverInput = z.infer<typeof driverSchema>;

export function extractDriverForm(fd: FormData): Record<string, unknown> {
  return {
    full_name: fd.get('full_name'),
    phone: fd.get('phone'),
    document: fd.get('document'),
    vehicle_plate: fd.get('vehicle_plate'),
    vehicle_model: fd.get('vehicle_model'),
    status: fd.get('status') || 'active',
    profile_id: fd.get('profile_id') || null,
    notes: fd.get('notes')
  };
}

// ─── Carrier ──────────────────────────────────────────────
export const carrierSchema = z.object({
  name: z.string().min(2).max(120),
  contact_name: z.string().max(120).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().max(120).optional().nullable(),
  tracking_url_template: z.string().max(300).optional().nullable(),
  is_active: z.coerce.boolean().default(true)
});
export type CarrierInput = z.infer<typeof carrierSchema>;

export function extractCarrierForm(fd: FormData): Record<string, unknown> {
  return {
    name: fd.get('name'),
    contact_name: fd.get('contact_name'),
    phone: fd.get('phone'),
    email: fd.get('email') || null,
    tracking_url_template: fd.get('tracking_url_template'),
    is_active: fd.get('is_active') !== 'off' && fd.get('is_active') !== 'false'
  };
}

// ─── Route ────────────────────────────────────────────────
export const routeSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional().nullable(),
  region: z.string().max(80).optional().nullable(),
  driver_id: z.string().uuid().optional().nullable(),
  is_active: z.coerce.boolean().default(true)
});
export type RouteInput = z.infer<typeof routeSchema>;

export function extractRouteForm(fd: FormData): Record<string, unknown> {
  return {
    name: fd.get('name'),
    description: fd.get('description'),
    region: fd.get('region'),
    driver_id: fd.get('driver_id') || null,
    is_active: fd.get('is_active') !== 'off' && fd.get('is_active') !== 'false'
  };
}

// ─── Manifest ─────────────────────────────────────────────
export const manifestCreateSchema = z.object({
  route_id: z.string().uuid().optional().nullable(),
  driver_id: z.string().uuid().optional().nullable(),
  carrier_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable()
});

export const manifestTransitionSchema = z.object({
  manifest_id: z.string().uuid(),
  target: z.enum(['ready', 'dispatched', 'in_transit', 'completed', 'cancelled'])
});

export const manifestAddDeliverySchema = z.object({
  manifest_id: z.string().uuid(),
  delivery_id: z.string().uuid()
});

// ─── Incident ─────────────────────────────────────────────
export const incidentSchema = z.object({
  delivery_id: z.string().uuid().optional().nullable(),
  manifest_id: z.string().uuid().optional().nullable(),
  severity: z.enum(['info', 'warning', 'error', 'critical']).default('warning'),
  kind: z.enum(['delay', 'damage', 'lost', 'wrong_address', 'return', 'other']),
  description: z.string().min(3).max(4000)
});
