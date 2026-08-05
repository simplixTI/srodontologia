import 'server-only';
import { logger } from './logger';

/**
 * Error tracking abstraction. Prefers Sentry when SENTRY_DSN is set;
 * otherwise falls back to structured logs so errors are still queryable
 * in whatever log aggregator (Vercel/Datadog) is configured.
 *
 * We don't bundle @sentry/nextjs to keep the tree small — production
 * deployments can install it and this file can forward via a dynamic
 * import in a follow-up.
 */

export type ErrorContext = {
  route?: string;
  user_id?: string;
  tenant_id?: string;
  extra?: Record<string, unknown>;
  tags?: Record<string, string>;
};

const sentryDsn = process.env.SENTRY_DSN;

export function captureError(err: unknown, ctx: ErrorContext = {}): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  if (sentryDsn) {
    // Forward-compat: fire-and-forget POST to Sentry Envelope endpoint.
    // Kept minimal on purpose. Full-fidelity should use @sentry/nextjs.
    void postToSentry(sentryDsn, {
      event_id: crypto.randomUUID().replace(/-/g, ''),
      timestamp: Date.now() / 1000,
      logentry: { message },
      exception: { values: [{ type: err instanceof Error ? err.name : 'Error', value: message, stacktrace: stack ? { frames: parseStack(stack) } : undefined }] },
      tags: ctx.tags,
      extra: ctx.extra,
      user: ctx.user_id ? { id: ctx.user_id } : undefined
    });
  }

  logger.error(message, {
    route: ctx.route,
    user_id: ctx.user_id,
    tenant_id: ctx.tenant_id,
    stack: stack?.slice(0, 4000),
    ...ctx.extra
  });
}

async function postToSentry(dsn: string, envelope: Record<string, unknown>): Promise<void> {
  try {
    // Parse DSN: https://<key>@<host>/<project>
    const match = dsn.match(/^https:\/\/([^@]+)@([^/]+)\/(\d+)$/);
    if (!match) return;
    const [, key, host, project] = match;
    const url = `https://${host}/api/${project}/store/?sentry_version=7&sentry_client=sr-digital/1.0&sentry_key=${key}`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope)
    });
  } catch {
    // swallow — error tracking must not throw
  }
}

function parseStack(stack: string): { filename?: string; function?: string; lineno?: number }[] {
  return stack.split('\n').slice(1, 20).map((line) => {
    const m = line.trim().match(/at (\S+) \(([^)]+):(\d+):\d+\)/);
    if (!m) return { function: line.trim() };
    return { function: m[1], filename: m[2], lineno: parseInt(m[3], 10) };
  });
}
