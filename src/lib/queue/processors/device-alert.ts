import 'server-only';
import { queueEmail } from '@/lib/email/outbox';
import type { Job } from '../types';

/**
 * Handles `device_alert` jobs enqueued by device-recognition when a login
 * happens from an unseen fingerprint. Enqueues a security email via outbox.
 */
export async function processDeviceAlert(
  job: Job<Record<string, unknown>>
): Promise<Record<string, unknown> | void> {
  const payload = job.payload as {
    user_id?: string;
    email?: string;
    full_name?: string | null;
    browser?: string;
    os?: string;
    detected_at?: string;
  };

  if (!payload?.email || !payload?.user_id) {
    return { skipped: true, reason: 'invalid_payload' };
  }

  const emailId = await queueEmail({
    organizationId: job.organization_id,
    to: payload.email,
    template: 'security_alert',
    recipient_name: payload.full_name ?? undefined,
    data: {
      event: `Novo dispositivo (${payload.browser ?? '?'} em ${payload.os ?? '?'})`,
      browser: payload.browser,
      os: payload.os,
      detected_at: payload.detected_at
    }
  });

  return { queued_email_id: emailId };
}
