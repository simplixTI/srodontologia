import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CasePriority } from '@/lib/validations/cases';
import type { PublicCaseStatus } from '@/features/cases/queries';
import type { QuoteStatus } from '@/features/quotes/types';
import type { PlanningStatus } from '@/features/planning/types';
import type { DeliveryStatus } from '@/features/deliveries/types';

export type PortalCaseDetail = {
  id: string;
  case_number: string;
  title: string;
  priority: CasePriority;
  public_status: PublicCaseStatus;
  internal_status: string;
  clinical_description: string | null;
  dentist_notes: string | null;
  material: string | null;
  shade: string | null;
  teeth_regions: string[] | null;
  requested_delivery_date: string | null;
  estimated_delivery_date: string | null;
  actual_delivery_date: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  case_type: { id: string; name: string } | null;
  clinic: { id: string; trade_name: string } | null;
};

export async function getPortalCase(id: string): Promise<PortalCaseDetail | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('cases')
    .select(
      'id, case_number, title, priority, public_status, internal_status, clinical_description, dentist_notes, material, shade, teeth_regions, requested_delivery_date, estimated_delivery_date, actual_delivery_date, created_at, updated_at, submitted_at, case_type:case_types(id, name), clinic:clinics(id, trade_name)'
    )
    .eq('id', id)
    .maybeSingle();
  return (data ?? null) as unknown as PortalCaseDetail | null;
}

export type PortalChecklistItem = {
  id: string;
  case_id: string;
  title_snapshot: string;
  description_snapshot: string | null;
  required_snapshot: boolean;
  category_snapshot: string;
  minimum_files_snapshot: number;
  status: 'pending' | 'in_progress' | 'completed' | 'waived';
  completed: boolean;
  sort_order_snapshot: number;
};

export async function listPortalChecklist(caseId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('case_checklist_items')
    .select(
      'id, case_id, title_snapshot, description_snapshot, required_snapshot, category_snapshot, minimum_files_snapshot, status, completed, sort_order_snapshot'
    )
    .eq('case_id', caseId)
    .order('sort_order_snapshot', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PortalChecklistItem[];
}

export type PortalFile = {
  id: string;
  file_name: string;
  original_name: string;
  extension: string;
  file_size: number;
  category: string;
  mime_type: string | null;
  created_at: string;
  checklist_item_id: string | null;
};

export async function listPortalCaseFiles(caseId: string): Promise<PortalFile[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('case_files')
    .select(
      'id, file_name, original_name, extension, file_size, category, mime_type, created_at, checklist_item_id'
    )
    .eq('case_id', caseId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PortalFile[];
}

export type PortalQuote = {
  id: string;
  case_id: string;
  quote_number: string;
  version_number: number;
  status: QuoteStatus;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  total: number;
  payment_terms: string | null;
  validity_date: string | null;
  estimated_days: number | null;
  public_notes: string | null;
  sent_at: string | null;
  approved_at: string | null;
  created_at: string;
};

export type PortalQuoteItem = {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  sort_order: number;
};

// Uses quotes_public view (excludes internal_notes) for safety.
export async function listPortalQuotes(caseId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('quotes_public')
    .select('*')
    .eq('case_id', caseId)
    .order('version_number', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PortalQuote[];
}

export async function listPortalQuoteItems(quoteIds: string[]) {
  if (quoteIds.length === 0) return new Map<string, PortalQuoteItem[]>();
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('quote_items')
    .select('id, quote_id, description, quantity, unit_price, discount, total, sort_order')
    .in('quote_id', quoteIds)
    .order('sort_order');
  if (error) throw new Error(error.message);
  const map = new Map<string, PortalQuoteItem[]>();
  for (const it of (data ?? []) as PortalQuoteItem[]) {
    const arr = map.get(it.quote_id) ?? [];
    arr.push(it);
    map.set(it.quote_id, arr);
  }
  return map;
}

export type PortalPlanning = {
  id: string;
  case_id: string;
  version_number: number;
  status: PlanningStatus;
  technical_description: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
};

export async function listPortalPlanning(caseId: string): Promise<PortalPlanning[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('planning_versions')
    .select('id, case_id, version_number, status, technical_description, submitted_at, approved_at, created_at')
    .eq('case_id', caseId)
    .order('version_number', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PortalPlanning[];
}

export type PortalDelivery = {
  id: string;
  case_id: string;
  status: DeliveryStatus;
  method: string | null;
  carrier: string | null;
  driver_name: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  recipient_name: string | null;
  estimated_delivery_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  confirmation_data: Record<string, unknown>;
  created_at: string;
};

export async function listPortalDeliveries(caseId: string): Promise<PortalDelivery[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('deliveries')
    .select('id, case_id, status, method, carrier, driver_name, tracking_code, tracking_url, recipient_name, estimated_delivery_at, shipped_at, delivered_at, notes, confirmation_data, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PortalDelivery[];
}

export type PortalMessage = {
  id: string;
  case_id: string;
  sender_id: string;
  message: string;
  reply_to_id: string | null;
  created_at: string;
  sender: { id: string; full_name: string } | null;
};

export async function listPortalMessages(caseId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('case_messages')
    .select(
      'id, case_id, sender_id, message, reply_to_id, created_at, sender:profiles!sender_id(id, full_name)'
    )
    .eq('case_id', caseId)
    .is('archived_at', null)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PortalMessage[];
}

export type PortalTimelineEntry = {
  id: string;
  new_public_status: PublicCaseStatus | null;
  public_note: string | null;
  created_at: string;
};

export async function getPortalCaseTimeline(caseId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('case_status_history')
    .select('id, new_public_status, public_note, created_at')
    .eq('case_id', caseId)
    .not('new_public_status', 'is', null)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PortalTimelineEntry[];
}

export async function listCaseTypesForPortalWizard() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('case_types')
    .select('id, name, description')
    .eq('active', true)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; name: string; description: string | null }[];
}
