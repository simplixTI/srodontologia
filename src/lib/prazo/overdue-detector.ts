import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { publishEvent } from '@/lib/events';

/**
 * Scans cases and emits `case.overdue` for cases that:
 *   - have an estimated_delivery_date in the past
 *   - are not yet delivered/cancelled
 *   - haven't been flagged as overdue already (once per case per day)
 *
 * Called periodically by the worker script (cron).
 */
export async function scanForOverdueCases(): Promise<number> {
  const admin = createSupabaseAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await admin
    .from('cases')
    .select('id, organization_id, case_number, title, estimated_delivery_date, internal_status')
    .lt('estimated_delivery_date', today)
    .not('internal_status', 'in', '(delivered,cancelled)')
    .limit(500);

  let emitted = 0;
  for (const c of data ?? []) {
    // De-dup: check if overdue event already emitted in last 24h
    const since = new Date(Date.now() - 86400000).toISOString();
    const { data: prev } = await admin
      .from('domain_events')
      .select('id')
      .eq('aggregate_type', 'case')
      .eq('aggregate_id', c.id)
      .eq('event_type', 'case.overdue')
      .gte('occurred_at', since)
      .maybeSingle();
    if (prev) continue;

    await publishEvent({
      organizationId: c.organization_id,
      type: 'case.overdue',
      aggregateType: 'case',
      aggregateId: c.id,
      payload: { case_number: c.case_number, title: c.title }
    });
    emitted++;
  }
  return emitted;
}
