/**
 * Domain event catalog.
 *
 * Every persisted event uses one of these types. Handlers subscribe
 * by matching `type` (exact match) or `type.startsWith(prefix)` via the bus.
 *
 * Payload is intentionally jsonb — feature-specific but must be small.
 * Do not embed full entities; embed ids and let handlers rehydrate.
 */

export const DOMAIN_EVENT_TYPES = [
  'case.created',
  'case.updated',
  'case.status_changed',
  'case.submitted',
  'case.completed',
  'case.overdue',
  'quote.created',
  'quote.sent',
  'quote.approved',
  'quote.changes_requested',
  'quote.rejected',
  'planning.created',
  'planning.sent',
  'planning.approved',
  'planning.changes_requested',
  'message.created',
  'delivery.dispatched',
  'delivery.delivered',
  'delivery.confirmed_by_dentist',
  'notification.created',
  'file.uploaded',
  'ocr.completed',
  'ai.summary_generated'
] as const;

export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number];

export type DomainEvent<T extends DomainEventType = DomainEventType> = {
  id?: string;
  organizationId: string;
  type: T;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  actorId?: string | null;
  occurredAt?: string;
};

export type DomainEventHandler = (
  event: DomainEvent
) => void | Promise<void>;
