'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ActionState = { ok: boolean; error?: string };

async function requireOrgAdmin() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string; role: string }>();
  if (!profile) throw new Error('Perfil não encontrado.');
  if (!['super_admin', 'admin'].includes(profile.role)) throw new Error('Apenas administradores.');
  return { supabase, user, profile };
}

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser um HEX válido (#RRGGBB).');

const schema = z.object({
  brand_name: z.string().min(2).max(120),
  primary_color: hex,
  accent_color: hex,
  logo_url: z.string().url().max(500).optional().nullable(),
  favicon_url: z.string().url().max(500).optional().nullable(),
  email_from_name: z.string().min(2).max(120),
  portal_greeting: z.string().max(500).optional().nullable()
});

export async function saveBrandingAction(input: unknown): Promise<ActionState> {
  try {
    const parsed = schema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    const { supabase, profile } = await requireOrgAdmin();

    const { error } = await supabase
      .from('organizations')
      .update({ branding: parsed.data })
      .eq('id', profile.organization_id);
    if (error) return { ok: false, error: error.message };

    revalidatePath('/branding');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}
