import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type QueueSnapshot = {
  queued: number;
  running: number;
  failed_24h: number;
  completed_24h: number;
  byKind: { kind: string; count: number }[];
};

export type EventStats = {
  last24h: number;
  byType: { type: string; count: number }[];
};

export type AiUsageStats = {
  monthTokens: number;
  monthCalls: number;
  byFeature: { feature: string; tokens: number }[];
};

export async function getQueueSnapshot(): Promise<QueueSnapshot> {
  const supabase = createSupabaseServerClient();
  const yesterday = new Date(Date.now() - 86400_000).toISOString();

  const [q, r, f, c, byKindRes] = await Promise.all([
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'queued'),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'running'),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('updated_at', yesterday),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('updated_at', yesterday),
    supabase.from('jobs').select('kind').gte('created_at', yesterday).limit(500)
  ]);

  const byKind = aggregateBy((byKindRes.data ?? []) as { kind: string }[], (r) => r.kind);

  return {
    queued: q.count ?? 0,
    running: r.count ?? 0,
    failed_24h: f.count ?? 0,
    completed_24h: c.count ?? 0,
    byKind
  };
}

export async function getEventStats(): Promise<EventStats> {
  const supabase = createSupabaseServerClient();
  const yesterday = new Date(Date.now() - 86400_000).toISOString();
  const { data, count } = await supabase
    .from('domain_events')
    .select('event_type', { count: 'exact' })
    .gte('occurred_at', yesterday)
    .limit(500);
  return {
    last24h: count ?? 0,
    byType: aggregateBy((data ?? []) as { event_type: string }[], (r) => r.event_type)
  };
}

export async function getAiUsageStats(): Promise<AiUsageStats> {
  const supabase = createSupabaseServerClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('ai_usage_log')
    .select('feature, input_tokens, output_tokens')
    .gte('created_at', monthStart.toISOString())
    .limit(2000);

  const rows = (data ?? []) as { feature: string; input_tokens: number; output_tokens: number }[];
  const monthTokens = rows.reduce((s, r) => s + (r.input_tokens ?? 0) + (r.output_tokens ?? 0), 0);
  const monthCalls = rows.length;

  const featureAgg = new Map<string, number>();
  for (const r of rows) {
    featureAgg.set(r.feature, (featureAgg.get(r.feature) ?? 0) + (r.input_tokens ?? 0) + (r.output_tokens ?? 0));
  }
  return {
    monthTokens,
    monthCalls,
    byFeature: Array.from(featureAgg.entries())
      .map(([feature, tokens]) => ({ feature, tokens }))
      .sort((a, b) => b.tokens - a.tokens)
  };
}

function aggregateBy<T>(rows: T[], key: (r: T) => string): { kind: string; count: number; type: string }[] {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return Array.from(m.entries())
    .map(([k, c]) => ({ kind: k, count: c, type: k }))
    .sort((a, b) => b.count - a.count);
}
