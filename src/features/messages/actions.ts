'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertRateLimit } from '@/lib/rate-limit';

export type ActionState = { ok: boolean; error?: string };

async function requireInternal() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string; role: string }>();
  if (!profile) throw new Error('No profile');
  return { supabase, user, profile };
}

export async function sendCaseMessageAction(
  caseId: string,
  formData: FormData
): Promise<ActionState> {
  const message = String(formData.get('message') ?? '').trim();
  const visibility = String(formData.get('visibility') ?? 'dentist') === 'internal' ? 'internal' : 'dentist';
  const reply_to_id = String(formData.get('reply_to_id') ?? '').trim() || null;

  if (message.length < 1) return { ok: false, error: 'Digite uma mensagem.' };
  if (message.length > 5000) return { ok: false, error: 'Mensagem muito longa.' };

  const { supabase, user, profile } = await requireInternal();

  // 60 messages per minute per user
  try {
    assertRateLimit(`msg:${user.id}`, { max: 60, windowMs: 60_000, label: 'Mensagens' });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const { error } = await supabase.from('case_messages').insert({
    organization_id: profile.organization_id,
    case_id: caseId,
    sender_id: user.id,
    message,
    visibility,
    reply_to_id
  } as never);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/casos/${caseId}`);
  return { ok: true };
}
