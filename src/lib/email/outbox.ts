import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { renderEmail, type EmailTemplateKey } from './templates';
import { resolveBrandingForOrg, DEFAULT_BRANDING } from '@/lib/branding/resolver';
import { sendEmailViaProvider } from '@/lib/integrations/email/provider';

export type QueueEmailInput = {
  organizationId: string | null;
  to: string;
  template: EmailTemplateKey;
  data?: Record<string, unknown>;
  recipient_name?: string;
  scheduledAt?: Date;
};

/**
 * Queues a transactional email. Actual send is done by the processor
 * `email_send` reading from `email_outbox`. Never bloqueia o request.
 */
export async function queueEmail(input: QueueEmailInput): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const branding = input.organizationId
    ? await resolveBrandingForOrg(input.organizationId)
    : DEFAULT_BRANDING;
  const rendered = renderEmail(input.template, {
    branding,
    recipient_name: input.recipient_name,
    data: input.data
  });

  const { data, error } = await admin.from('email_outbox').insert({
    organization_id: input.organizationId,
    to_email: input.to,
    from_email: process.env.EMAIL_FROM ?? 'no-reply@srdigital.com.br',
    from_name: branding.email_from_name,
    template: input.template,
    data: input.data ?? {},
    subject: rendered.subject,
    scheduled_at: (input.scheduledAt ?? new Date()).toISOString()
  }).select('id').single<{ id: string }>();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[email:queueEmail] failed', error.message);
    return null;
  }
  return data.id;
}

/**
 * Dispatches queued emails ready to send. Processed by the queue worker
 * via a periodic scan (see `dispatchOutboxTick` used in cron).
 */
export async function dispatchOutboxTick(limit = 20): Promise<{ sent: number; failed: number }> {
  const admin = createSupabaseAdminClient();
  const { data: rows } = await admin
    .from('email_outbox')
    .select('id, organization_id, to_email, template, data, subject')
    .eq('status', 'queued')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at')
    .limit(limit);

  let sent = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    // Optimistic locking: mark sending first
    const { data: locked } = await admin
      .from('email_outbox')
      .update({ status: 'sending', attempts: 1 })
      .eq('id', (row as { id: string }).id)
      .eq('status', 'queued')
      .select('id')
      .maybeSingle();
    if (!locked) continue;

    try {
      const branding = (row as { organization_id: string | null }).organization_id
        ? await resolveBrandingForOrg((row as { organization_id: string }).organization_id)
        : DEFAULT_BRANDING;
      const rendered = renderEmail((row as { template: EmailTemplateKey }).template, {
        branding,
        data: (row as { data: Record<string, unknown> }).data ?? {}
      });
      const res = await sendEmailViaProvider((row as { organization_id: string | null }).organization_id ?? '', {
        to: (row as { to_email: string }).to_email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text
      });
      await admin.from('email_outbox').update({
        status: 'sent',
        provider: res.provider,
        provider_message_id: res.id ?? null,
        sent_at: new Date().toISOString()
      }).eq('id', (row as { id: string }).id);
      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      await admin.from('email_outbox').update({
        status: 'failed',
        error: msg
      }).eq('id', (row as { id: string }).id);
      failed++;
    }
  }
  return { sent, failed };
}
