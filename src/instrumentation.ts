/**
 * Next.js instrumentation entrypoint.
 * Loads Sentry SDK for server/edge runtimes when SENTRY_DSN is present.
 * Client runtime is initialized separately via `sentry.client.config.ts`.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  } else if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
