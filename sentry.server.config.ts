import * as Sentry from '@sentry/nextjs';
import { beforeSendRedactor } from '@/lib/observability/sentry-redaction';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.DEPLOY_ENV ?? process.env.NODE_ENV ?? 'development',
    release: process.env.APP_VERSION,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      return beforeSendRedactor(event as unknown as Record<string, unknown>) as unknown as typeof event;
    }
  });
}
