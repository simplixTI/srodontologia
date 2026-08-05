import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CalendarEvent } from './types';

export async function listEvents(range: { from: string; to: string }): Promise<CalendarEvent[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .gte('start_at', range.from)
    .lte('start_at', range.to)
    .is('cancelled_at', null)
    .order('start_at', { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as CalendarEvent[];
}

export async function getEvent(id: string): Promise<CalendarEvent | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('id', id)
    .maybeSingle<CalendarEvent>();
  if (error) throw new Error(error.message);
  return data;
}

export async function listEventsUpcoming(limit = 20): Promise<CalendarEvent[]> {
  const supabase = createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .gte('start_at', nowIso)
    .is('cancelled_at', null)
    .order('start_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as CalendarEvent[];
}

export async function generateIcs(eventId: string): Promise<string | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc('generate_ics', { p_event_id: eventId });
  if (error) throw new Error(error.message);
  return data as string | null;
}
