import 'server-only';
import { createHash } from 'crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { runAi, sanitizeUserText } from '@/lib/ai';
import type { JobProcessor } from '../types';

type Payload = { case_id: string };

export const processAiCaseSummary: JobProcessor<Payload> = async (job) => {
  const admin = createSupabaseAdminClient();
  const { case_id } = job.payload;
  if (!case_id) throw new Error('ai_case_summary missing case_id');

  const context = await buildCaseContext(admin, case_id);
  if (!context) return { skipped: 'case_not_found' };

  const sourceHash = hashContext(context);

  const { data: cached } = await admin
    .from('case_ai_summaries')
    .select('source_hash')
    .eq('case_id', case_id)
    .maybeSingle();
  if (cached?.source_hash === sourceHash) return { skipped: 'up_to_date' };

  const res = await runAi({
    organizationId: job.organization_id,
    feature: 'case_summary',
    role: 'Você é um assistente de laboratório odontológico. Gere um resumo objetivo do caso em pt-BR, em até 5 bullets, listando: (1) status atual, (2) últimas ações, (3) pendências claras, (4) próximos passos sugeridos.',
    userMessages: [{ role: 'user', content: sanitizeUserText(JSON.stringify(context), { label: 'CASE STATE JSON' }) }],
    caseId: case_id
  });

  const parsed = parseSummary(res.text);

  await admin.from('case_ai_summaries').upsert({
    case_id,
    organization_id: job.organization_id,
    summary: parsed.summary,
    pending: parsed.pending,
    next_steps: parsed.nextSteps,
    source_hash: sourceHash,
    model: res.model
  });

  return { updated: true, degraded: 'degraded' in res ? res.degraded : false };
};

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

async function buildCaseContext(admin: AdminClient, caseId: string) {
  const [{ data: c }, { data: msgs }, { data: quotes }, { data: history }] = await Promise.all([
    admin
      .from('cases')
      .select('id, case_number, title, public_status, internal_status, clinical_description, material, shade, requested_delivery_date, estimated_delivery_date, priority')
      .eq('id', caseId)
      .maybeSingle(),
    admin
      .from('case_messages')
      .select('created_at, message, visibility')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .limit(6),
    admin
      .from('quotes')
      .select('status, total, sent_at, approved_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .limit(3),
    admin
      .from('case_status_history')
      .select('created_at, new_public_status, public_note')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .limit(6)
  ]);
  if (!c) return null;
  return { case: c, messages: msgs ?? [], quotes: quotes ?? [], history: history ?? [] };
}

function hashContext(ctx: unknown): string {
  return createHash('sha256').update(JSON.stringify(ctx)).digest('hex');
}

function parseSummary(text: string): { summary: string; pending: string[]; nextSteps: string[] } {
  const pending = extractBulletsAfter(text, /pend[êe]ncias?/i);
  const nextSteps = extractBulletsAfter(text, /pr[óo]ximos? passos?/i);
  return { summary: text.trim(), pending, nextSteps };
}

function extractBulletsAfter(text: string, header: RegExp): string[] {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => header.test(l));
  if (start === -1) return [];
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) break;
    const m = t.match(/^[-*•]\s*(.+)$/);
    if (m) out.push(m[1]);
    else break;
  }
  return out;
}
