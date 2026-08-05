import Script from 'next/script';

/**
 * Client-side error tracking bootstrap.
 *
 * Loads Sentry Loader Script (~2KB) — Sentry only sends a real bundle
 * after the FIRST error, keeping cold-start cost near zero.
 *
 * The Loader is safer than @sentry/nextjs when you don't have source-maps
 * pipeline setup. Server-side capture continues via captureError().
 *
 * Setup:
 *   1. Set NEXT_PUBLIC_SENTRY_LOADER_SRC in env (URL from your Sentry project)
 *   2. Set SENTRY_DSN (server-only) for server-side capture
 *
 * When either is missing, this component renders nothing.
 */
export function SentryLoader() {
  const src = process.env.NEXT_PUBLIC_SENTRY_LOADER_SRC;
  if (!src) return null;
  return (
    <Script
      src={src}
      strategy="afterInteractive"
      crossOrigin="anonymous"
      data-lazy="no"
    />
  );
}
