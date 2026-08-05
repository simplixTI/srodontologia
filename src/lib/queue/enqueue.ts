import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { EnqueueJobOptions, Job } from './types';

/**
 * Server-side job enqueue via SERVICE ROLE (bypasses RLS).
 *
 * Caller MUST already have verified the actor's permission for the operation
 * that triggered this job. This function does not check auth — it is
 * intended to be invoked from server actions after a `requireXxx()` guard.
 */
export async function enqueueJob(opts: EnqueueJobOptions): Promise<Job | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('jobs')
    .insert({
      organization_id: opts.organizationId,
      kind: opts.kind,
      payload: opts.payload ?? {},
      case_id: opts.caseId ?? null,
      run_after: normalizeRunAfter(opts.runAfter),
      priority: opts.priority ?? 5,
      max_attempts: opts.maxAttempts ?? 3,
      created_by: opts.createdBy ?? null
    })
    .select('*')
    .single();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[queue] enqueue failed:', error.message);
    return null;
  }
  return data as Job;
}

function normalizeRunAfter(v: EnqueueJobOptions['runAfter']): string {
  if (!v) return new Date().toISOString();
  if (v instanceof Date) return v.toISOString();
  return v;
}
