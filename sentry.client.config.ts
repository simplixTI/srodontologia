import * as Sentry from '@sentry/nextjs';
import { beforeSendRedactor } from '@/lib/observability/sentry-redaction';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_DEPLOY_ENV ?? 'development',
    release: process.env.NEXT_PUBLIC_APP_VERSION,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    integrations: [],
    sendDefaultPii: false,
    beforeSend(event) {
      return beforeSendRedactor(event as unknown as Record<string, unknown>) as unknown as typeof event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') return null;
      return breadcrumb;
    }
  });
}
