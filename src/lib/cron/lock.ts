import 'server-only';
import { randomUUID } from 'crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type CronLock = { runId: string; workerId: string };

/**
 * Attempts to acquire an exclusive lock for a cron by name.
 * Returns null if another instance is already running (unique index blocks).
 */
export async function acquireCronLock(name: string): Promise<CronLock | null> {
  const admin = createSupabaseAdminClient();
  const workerId = `worker-${randomUUID().slice(0, 8)}`;
  const { data, error } = await admin.rpc('try_acquire_cron_lock', {
    p_name: name,
    p_worker_id: workerId
  });
  if (error || !data) return null;
  return { runId: data as string, workerId };
}

export async function releaseCronLock(
  lock: CronLock,
  status: 'success' | 'failed' | 'cancelled',
  metrics: Record<string, unknown> = {},
  error?: string
): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.rpc('release_cron_lock', {
    p_id: lock.runId,
    p_status: status,
    p_error: error ?? null,
    p_metrics: metrics
  });
}

/**
 * Convenience: acquire → run → release, with error safety.
 */
export async function runWithLock<T>(
  name: string,
  fn: () => Promise<{ metrics?: Record<string, unknown>; result: T }>
): Promise<{ status: 'ran' | 'skipped_locked' | 'failed'; result?: T; error?: string }> {
  const lock = await acquireCronLock(name);
  if (!lock) return { status: 'skipped_locked' };
  try {
    const { metrics, result } = await fn();
    await releaseCronLock(lock, 'success', metrics ?? {});
    return { status: 'ran', result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await releaseCronLock(lock, 'failed', {}, message);
    return { status: 'failed', error: message };
  }
}
