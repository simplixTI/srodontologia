'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function markNotificationReadAction(id: string) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString(), status: 'read' } as never)
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
}

export async function markAllReadAction() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString(), status: 'read' } as never)
    .is('read_at', null)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
}
