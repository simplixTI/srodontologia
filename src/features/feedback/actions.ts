'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { track } from '@/lib/analytics/tracker';

export type ActionState = { ok: boolean; error?: string; id?: string };

const schema = z.object({
  kind: z.enum(['bug', 'question', 'suggestion', 'friction', 'performance']),
  category: z.string().max(80).optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  comment: z.string().max(2000).optional().nullable(),
  route: z.string().max(500).optional().nullable()
});

export async function submitFeedbackAction(input: unknown): Promise<ActionState> {
  try {
    const parsed = schema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Não autenticado.' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle<{ organization_id: string | null }>();

    const { data, error } = await supabase.from('product_feedback').insert({
      user_id: user.id,
      organization_id: profile?.organization_id ?? null,
      kind: parsed.data.kind,
      category: parsed.data.category ?? null,
      rating: parsed.data.rating ?? null,
      comment: parsed.data.comment ?? null,
      route: parsed.data.route ?? null
    }).select('id').single<{ id: string }>();
    if (error) return { ok: false, error: error.message };

    await track({
      event: 'feedback_submitted',
      userId: user.id,
      organizationId: profile?.organization_id ?? null,
      properties: { kind: parsed.data.kind, route: parsed.data.route ?? null }
    });

    revalidatePath('/');
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}
