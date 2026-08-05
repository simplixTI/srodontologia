import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { DomainEvent, DomainEventHandler, DomainEventType } from './types';

/**
 * In-process event bus with persistent audit trail.
 *
 * Two responsibilities:
 *   1) persist every event into `domain_events` (audit + replay)
 *   2) fanout to in-process handlers registered per-type or per-prefix
 *
 * Handlers run fire-and-forget from the caller's perspective, but the bus
 * awaits them internally so errors are logged (never leaking to the caller).
 * If a handler needs guaranteed retries, it should enqueue a job instead
 * of doing work inline.
 */

type HandlerEntry = {
  match: string;         // exact type or prefix ending with '.*'
  handler: DomainEventHandler;
  name: string;
};

const HANDLERS: HandlerEntry[] = [];

export function registerEventHandler(
  match: DomainEventType | `${string}.*`,
  handler: DomainEventHandler,
  name = handler.name || 'anonymous'
): void {
  HANDLERS.push({ match, handler, name });
}

/**
 * Persist + fanout. Never throws to the caller.
 * Returns the persisted event id (or null if persistence failed).
 */
export async function emitEvent(event: DomainEvent): Promise<string | null> {
  const id = await persistEvent(event);
  const enriched: DomainEvent = { ...event, id: id ?? event.id };
  await runHandlers(enriched);
  return id;
}

async function persistEvent(event: DomainEvent): Promise<string | null> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('domain_events')
      .insert({
        organization_id: event.organizationId,
        event_type: event.type,
        aggregate_type: event.aggregateType,
        aggregate_id: event.aggregateId,
        payload: event.payload ?? {},
        actor_id: event.actorId ?? null
      })
      .select('id')
      .single();
    if (error) return null;
    return (data as { id: string } | null)?.id ?? null;
  } catch {
    return null;
  }
}

async function runHandlers(event: DomainEvent): Promise<void> {
  const matching = HANDLERS.filter((h) => matchesType(event.type, h.match));
  await Promise.all(
    matching.map(async (h) => {
      try {
        await h.handler(event);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[event bus] handler ${h.name} failed for ${event.type}:`, err);
      }
    })
  );
}

function matchesType(type: string, match: string): boolean {
  if (match.endsWith('.*')) return type.startsWith(match.slice(0, -1));
  return type === match;
}

/** Mark an event as processed. Used by the automation engine. */
export async function markEventProcessed(eventId: string): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    await admin
      .from('domain_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', eventId);
  } catch {
    // best effort
  }
}
