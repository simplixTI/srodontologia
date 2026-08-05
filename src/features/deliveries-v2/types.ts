export type DriverStatus = 'active' | 'inactive' | 'vacation' | 'on_leave';

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  vacation: 'Férias',
  on_leave: 'Afastado'
};

export type ManifestStatus =
  | 'draft'
  | 'ready'
  | 'dispatched'
  | 'in_transit'
  | 'completed'
  | 'cancelled';

export const MANIFEST_STATUS_LABELS: Record<ManifestStatus, string> = {
  draft: 'Rascunho',
  ready: 'Pronto para saída',
  dispatched: 'Despachado',
  in_transit: 'Em trânsito',
  completed: 'Concluído',
  cancelled: 'Cancelado'
};

export const MANIFEST_STATUS_COLORS: Record<ManifestStatus, string> = {
  draft: 'border-white/20 text-white/60',
  ready: 'border-cyan-400/40 text-cyan-200 bg-cyan-400/10',
  dispatched: 'border-blue-400/40 text-blue-200 bg-blue-400/10',
  in_transit: 'border-amber-400/40 text-amber-200 bg-amber-400/10',
  completed: 'border-emerald-400/40 text-emerald-200 bg-emerald-400/10',
  cancelled: 'border-white/10 text-white/40'
};

export type IncidentSeverity = 'info' | 'warning' | 'error' | 'critical';

export type Driver = {
  id: string;
  organization_id: string;
  profile_id: string | null;
  full_name: string;
  phone: string | null;
  document: string | null;
  vehicle_plate: string | null;
  vehicle_model: string | null;
  status: DriverStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Carrier = {
  id: string;
  organization_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  tracking_url_template: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Route = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  region: string | null;
  driver_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Manifest = {
  id: string;
  organization_id: string;
  code: string;
  route_id: string | null;
  driver_id: string | null;
  carrier_id: string | null;
  status: ManifestStatus;
  qr_token: string | null;
  dispatched_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ManifestWithMeta = Manifest & {
  driver_name: string | null;
  route_name: string | null;
  carrier_name: string | null;
  item_count: number;
};

export type ManifestItem = {
  id: string;
  organization_id: string;
  manifest_id: string;
  delivery_id: string;
  position: number;
  created_at: string;
};

export type DeliveryIncident = {
  id: string;
  organization_id: string;
  delivery_id: string | null;
  manifest_id: string | null;
  severity: IncidentSeverity;
  kind: string;
  description: string;
  reported_by: string | null;
  resolved_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type DeliveryKpis = {
  organization_id: string;
  delivered_30d: number;
  open_total: number;
  dispatched_total: number;
  in_transit_total: number;
  delivered_7d: number;
};
