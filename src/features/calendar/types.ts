export type CalendarEventKind =
  | 'pickup'
  | 'delivery'
  | 'production'
  | 'meeting'
  | 'return'
  | 'deadline'
  | 'sla'
  | 'internal'
  | 'other';

export const CALENDAR_EVENT_KIND_LABELS: Record<CalendarEventKind, string> = {
  pickup: 'Coleta',
  delivery: 'Entrega',
  production: 'Produção',
  meeting: 'Reunião',
  return: 'Retorno',
  deadline: 'Prazo',
  sla: 'SLA',
  internal: 'Interno',
  other: 'Outro'
};

export const CALENDAR_EVENT_KIND_COLORS: Record<CalendarEventKind, string> = {
  pickup: '#3B82F6',
  delivery: '#22C55E',
  production: '#F59E0B',
  meeting: '#8B5CF6',
  return: '#EF4444',
  deadline: '#EC4899',
  sla: '#EAB308',
  internal: '#6B7280',
  other: '#94A3B8'
};

export type CalendarEvent = {
  id: string;
  organization_id: string;
  kind: CalendarEventKind;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string | null;
  color: string;
  case_id: string | null;
  source_type: string | null;
  source_id: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type AttendeeResponse = 'pending' | 'accepted' | 'declined' | 'tentative';

export const ATTENDEE_RESPONSE_LABELS: Record<AttendeeResponse, string> = {
  pending: 'Pendente',
  accepted: 'Confirmado',
  declined: 'Recusado',
  tentative: 'Talvez'
};

export type Attendee = {
  id: string;
  event_id: string;
  profile_id: string;
  response: AttendeeResponse;
  responded_at: string | null;
  created_at: string;
  profile_name?: string | null;
};
