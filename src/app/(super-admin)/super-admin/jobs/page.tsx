import type { Metadata } from 'next';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { JobsPanel } from './JobsPanel';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Jobs · SR Platform' };

type JobRow = {
  id: string;
  kind: string;
  status: string;
  attempts: number;
  max_attempts: number;
  priority: number;
  error: string | null;
  created_at: string;
  completed_at: string | null;
  dead_lettered_at: string | null;
  organization: { name: string } | null;
};

export default async function JobsPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = searchParams.status ?? 'all';
  const admin = createSupabaseAdminClient();

  let q = admin
    .from('jobs')
    .select('id, kind, status, attempts, max_attempts, priority, error, created_at, completed_at, dead_lettered_at, organization:organizations(name)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (status !== 'all') q = q.eq('status', status);

  const [{ data }, counts] = await Promise.all([q, getStatusCounts(admin)]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <h1 className="font-display text-3xl text-white md:text-4xl">Jobs</h1>
        <p className="mt-2 text-sm text-white/60">
          Fila de processamento assíncrono. Reprocessar/cancelar audita em security_events.
        </p>
      </header>
      <JobsPanel jobs={(data ?? []) as unknown as JobRow[]} counts={counts} currentStatus={status} />
    </div>
  );
}

async function getStatusCounts(admin: ReturnType<typeof createSupabaseAdminClient>) {
  const statuses = ['queued', 'running', 'completed', 'failed', 'dead_letter', 'cancelled'];
  const entries = await Promise.all(
    statuses.map(async (s) => {
      const { count } = await admin.from('jobs').select('id', { count: 'exact', head: true }).eq('status', s);
      return [s, count ?? 0] as const;
    })
  );
  return Object.fromEntries(entries) as Record<string, number>;
}
