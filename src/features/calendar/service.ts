import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CalendarEventInput } from '@/lib/validations/calendar';
import type { CalendarEvent } from './types';

export async function createEvent(
  orgId: string,
  input: CalendarEventInput
): Promise<CalendarEvent> {
  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      organization_id: orgId,
      kind: input.kind,
      title: input.title.trim(),
      description: input.description ?? null,
      start_at: new Date(input.start_at).toISOString(),
      end_at: new Date(input.end_at).toISOString(),
      all_day: input.all_day,
      location: input.location ?? null,
      color: input.color,
      case_id: input.case_id ?? null,
      created_by: userData.user?.id ?? null
    } as never)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as CalendarEvent;
}

export async function updateEvent(
  id: string,
  patch: Partial<CalendarEventInput>
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('calendar_events')
    .update({
      ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description ?? null } : {}),
      ...(patch.start_at !== undefined
        ? { start_at: new Date(patch.start_at).toISOString() }
        : {}),
      ...(patch.end_at !== undefined ? { end_at: new Date(patch.end_at).toISOString() } : {}),
      ...(patch.all_day !== undefined ? { all_day: patch.all_day } : {}),
      ...(patch.location !== undefined ? { location: patch.location ?? null } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.case_id !== undefined ? { case_id: patch.case_id ?? null } : {})
    } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function cancelEvent(id: string, reason: string | null): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('calendar_events')
    .update({
      cancelled_at: new Date().toISOString(),
      cancelled_reason: reason
    } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('calendar_events').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
