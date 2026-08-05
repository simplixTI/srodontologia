'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { runAi, sanitizeUserText } from '@/lib/ai';
import { assertRateLimit } from '@/lib/rate-limit';
import { enqueueJob } from '@/lib/queue/enqueue';
import { queryLabInsights } from './insights';

export type AssistantAnswer =
  | { ok: true; text: string; degraded?: boolean; reason?: string }
  | { ok: false; error: string };

async function requireAny() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string; role: string }>();
  if (!profile) throw new Error('Perfil não encontrado.');
  return { supabase, user, profile };
}

/** Lab assistant — internal users only. */
export async function askLabAssistantAction(question: string): Promise<AssistantAnswer> {
  try {
    const { user, profile } = await requireAny();
    const allowed = ['super_admin', 'admin', 'commercial', 'technical_planning', 'production', 'finance', 'logistics'];
    if (!allowed.includes(profile.role)) return { ok: false, error: 'Acesso negado.' };
    assertRateLimit(`ai-lab:${user.id}`, { max: 20, windowMs: 60_000, label: 'Perguntas ao assistente' });

    // Enrich with real numbers from the DB when the question maps to a known query.
    const insights = await queryLabInsights(profile.organization_id, question);

    const res = await runAi({
      organizationId: profile.organization_id,
      feature: 'lab_assistant',
      role:
        'Você é um assistente executivo de um laboratório de prótese odontológica. Responda em pt-BR, seja direto, use bullets quando fizer sentido e use os DADOS fornecidos abaixo — nunca invente números.',
      guardrails: ['Nunca inventar métricas. Se não houver dado, dizer que precisa de mais contexto.'],
      userMessages: [
        {
          role: 'user',
          content: `${sanitizeUserText(question, { label: 'USER QUESTION' })}\n\nDADOS DA ORGANIZAÇÃO (autoritativo):\n${insights.summary}`
        }
      ],
      userId: user.id
    });
    return { ok: true, text: res.text, degraded: (res as { degraded?: boolean }).degraded };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha no assistente.' };
  }
}

/** Dentist assistant — portal only. */
export async function askDentistAssistantAction(question: string): Promise<AssistantAnswer> {
  try {
    const { user, profile } = await requireAny();
    if (profile.role !== 'dentist') return { ok: false, error: 'Acesso negado.' };
    assertRateLimit(`ai-dentist:${user.id}`, { max: 20, windowMs: 60_000, label: 'Perguntas ao assistente' });

    const res = await runAi({
      organizationId: profile.organization_id,
      feature: 'dentist_assistant',
      role:
        'Você é uma assistente do portal do dentista da SR Digital. Explique como usar o portal (envio de arquivos, aprovação de orçamento, aprovação de planejamento, entregas). Nunca prometa prazos específicos — direcione o dentista à página do caso. Responda em pt-BR, curto e amigável.',
      guardrails: ['Nunca inventar status ou datas de casos. Direcionar sempre à página do caso.'],
      userMessages: [{ role: 'user', content: sanitizeUserText(question, { label: 'DENTIST QUESTION' }) }],
      userId: user.id
    });
    return { ok: true, text: res.text, degraded: (res as { degraded?: boolean }).degraded };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha no assistente.' };
  }
}

/** Requests the async AI summary generation for a case. Enqueues a job. */
export async function requestCaseSummaryAction(caseId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { profile } = await requireAny();
    const job = await enqueueJob({
      organizationId: profile.organization_id,
      kind: 'ai_case_summary',
      payload: { case_id: caseId },
      caseId,
      priority: 4
    });
    return { ok: !!job };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha ao solicitar resumo.' };
  }
}
