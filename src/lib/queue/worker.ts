import 'server-only';
import { randomUUID } from 'crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getJobProcessor, listRegisteredKinds } from './registry';
import type { Job, JobKind } from './types';
import { bootstrapProcessors } from './processors';

/**
 * Pulls the next available job (atomic FOR UPDATE SKIP LOCKED via RPC)
 * and runs it. Returns true if a job was processed, false if the queue
 * was empty. Never throws.
 *
 * Retries are handled by re-queueing on failure (status back to 'queued'
 * with an exponential backoff run_after) until max_attempts is reached.
 */
export async function processNextJob(workerId?: string): Promise<boolean> {
  bootstrapProcessors();
  const admin = createSupabaseAdminClient();
  const id = workerId ?? `worker-${randomUUID().slice(0, 8)}`;
  const kinds = listRegisteredKinds();

  const { data, error } = await admin.rpc('dequeue_next_job', {
    p_worker_id: id,
    p_kinds: kinds as JobKind[]
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[queue worker] dequeue error:', error.message);
    return false;
  }
  const job = Array.isArray(data) ? (data[0] as Job | undefined) : (data as Job | undefined);
  if (!job) return false;

  const processor = getJobProcessor(job.kind);
  if (!processor) {
    await finalizeJob(job, 'failed', null, `No processor registered for kind ${job.kind}`);
    return true;
  }

  try {
    const result = await processor(job);
    await finalizeJob(job, 'completed', result ?? null, null);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // `job.attempts` was already incremented by dequeue_next_job.
    if (job.attempts >= job.max_attempts) {
      await moveToDeadLetter(job, message);
    } else {
      await scheduleRetry(job, message);
    }
  }
  return true;
}

/**
 * Simple in-process worker loop — call from a long-lived server context
 * (e.g. a small Node script invoked by cron / Vercel Cron / a Docker sidecar).
 * We do NOT run this inside Next.js request handlers.
 */
export async function runWorkerLoop(opts: {
  pollIntervalMs?: number;
  workerId?: string;
  signal?: AbortSignal;
} = {}): Promise<void> {
  const poll = opts.pollIntervalMs ?? 1500;
  while (!opts.signal?.aborted) {
    const processed = await processNextJob(opts.workerId);
    if (!processed) await sleep(poll);
  }
}

async function finalizeJob(
  job: Job,
  status: 'completed' | 'failed',
  result: Record<string, unknown> | null,
  error: string | null
): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin
    .from('jobs')
    .update({
      status,
      result: result as unknown,
      error,
      completed_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null
    })
    .eq('id', job.id);
}

async function scheduleRetry(job: Job, error: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const delay = backoffMs(job.attempts);
  const runAfter = new Date(Date.now() + delay).toISOString();
  await admin
    .from('jobs')
    .update({
      status: 'queued',
      error,
      locked_at: null,
      locked_by: null,
      run_after: runAfter
    })
    .eq('id', job.id);
}

async function moveToDeadLetter(job: Job, error: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin
    .from('jobs')
    .update({
      status: 'dead_letter',
      error,
      dead_lettered_at: new Date().toISOString(),
      dead_letter_reason: error,
      completed_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null
    })
    .eq('id', job.id);

  await admin.from('operational_alerts').insert({
    organization_id: job.organization_id,
    source: 'jobs',
    severity: 'error',
    title: `Job em dead-letter: ${job.kind}`,
    message: `Job ${job.id} atingiu ${job.max_attempts} tentativas. Último erro: ${error.slice(0, 200)}`,
    metadata: { job_id: job.id, kind: job.kind }
  });
}

function backoffMs(attempt: number): number {
  // 1min, 5min, 15min, 1h, 6h — with ±20% jitter
  const seq = [60_000, 300_000, 900_000, 3_600_000, 21_600_000];
  const base = seq[Math.min(attempt - 1, seq.length - 1)] ?? seq[seq.length - 1];
  const jitter = base * 0.2 * (Math.random() * 2 - 1);
  return Math.max(1000, Math.round(base + jitter));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
