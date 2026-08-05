'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { enqueueJob } from '@/lib/queue/enqueue';
import { assertRateLimit } from '@/lib/rate-limit';

export type OcrActionState = { ok: boolean; error?: string; job_id?: string };

async function requireInternal() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string; role: string }>();
  if (!profile) throw new Error('Perfil não encontrado.');
  const allowed = ['super_admin', 'admin', 'technical_planning', 'production', 'commercial'];
  if (!allowed.includes(profile.role)) throw new Error('Acesso negado.');
  return { supabase, user, profile };
}

const triggerSchema = z.object({
  case_file_id: z.string().uuid(),
  target: z.enum(['document', 'clinical_form', 'receipt']).default('document')
});

export async function triggerOcrAction(input: unknown): Promise<OcrActionState> {
  try {
    const parsed = triggerSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

    const { user, profile } = await requireInternal();
    assertRateLimit(`ocr:${user.id}`, { max: 10, windowMs: 60_000, label: 'Extrações OCR' });

    const job = await enqueueJob({
      organizationId: profile.organization_id,
      kind: 'ocr_document',
      payload: { case_file_id: parsed.data.case_file_id, target: parsed.data.target },
      createdBy: user.id
    });

    revalidatePath('/ocr');
    return { ok: !!job, job_id: job?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha ao iniciar OCR.' };
  }
}

const reviewSchema = z.object({
  extraction_id: z.string().uuid(),
  fields: z.record(z.unknown()).optional(),
  action: z.enum(['confirm', 'reject'])
});

export async function reviewOcrAction(input: unknown): Promise<OcrActionState> {
  try {
    const parsed = reviewSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: 'Dados inválidos.' };
    const { supabase, user, profile } = await requireInternal();

    const patch: Record<string, unknown> = {
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      status: parsed.data.action === 'confirm' ? 'confirmed' : 'rejected'
    };
    if (parsed.data.fields) patch.fields = parsed.data.fields;

    const { error } = await supabase
      .from('ocr_extractions')
      .update(patch)
      .eq('id', parsed.data.extraction_id)
      .eq('organization_id', profile.organization_id);
    if (error) return { ok: false, error: error.message };

    revalidatePath('/ocr');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha ao revisar OCR.' };
  }
}
