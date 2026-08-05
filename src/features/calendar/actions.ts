'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  calendarEventSchema,
  extractCalendarForm,
  type CalendarEventInput
} from '@/lib/validations/calendar';
import { cancelEvent, createEvent, deleteEvent, updateEvent } from './service';

export type ActionState = { ok: boolean; error?: string; id?: string };

async function requireInternal() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string; role: string }>();
  if (!profile) throw new Error('No profile');
  if (profile.role === 'dentist') throw new Error('Forbidden');
  return { orgId: profile.organization_id };
}

export async function createEventAction(
  _prev: ActionState | undefined,
  fd: FormData
): Promise<ActionState> {
  const raw = extractCalendarForm(fd);
  const parsed = calendarEventSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  try {
    const { orgId } = await requireInternal();
    const ev = await createEvent(orgId, parsed.data);
    revalidatePath('/agenda');
    redirect(`/agenda/${ev.id}`);
  } catch (e) {
    if (e instanceof Error && !e.message.includes('NEXT_REDIRECT'))
      return { ok: false, error: e.message };
    throw e;
  }
  return { ok: true };
}

export async function updateEventAction(id: string, patch: Partial<CalendarEventInput>): Promise<void> {
  await requireInternal();
  await updateEvent(id, patch);
  revalidatePath('/agenda');
  revalidatePath(`/agenda/${id}`);
}

export async function cancelEventAction(id: string, reason: string | null): Promise<void> {
  await requireInternal();
  await cancelEvent(id, reason);
  revalidatePath('/agenda');
}

export async function deleteEventAction(id: string): Promise<void> {
  await requireInternal();
  await deleteEvent(id);
  revalidatePath('/agenda');
}
