import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/observability/logger';

export type ChannelKind = 'email' | 'slack' | 'discord' | 'teams' | 'webhook';

export type OpAlert = {
  organizationId?: string | null;
  source: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Records an operational alert and fans out to configured channels.
 * Platform-level alerts (organization_id=null) go to platform channels.
 * Tenant-level alerts go to channels registered by the tenant.
 */
export async function raiseAlert(alert: OpAlert): Promise<void> {
  const admin = createSupabaseAdminClient();

  await admin.from('operational_alerts').insert({
    organization_id: alert.organizationId ?? null,
    source: alert.source,
    severity: alert.severity,
    title: alert.title,
    message: alert.message ?? null,
    metadata: alert.metadata ?? {}
  });

  const { data: channels } = await admin
    .from('notification_channels')
    .select('kind, target, events, enabled')
    .or(`organization_id.eq.${alert.organizationId ?? '00000000-0000-0000-0000-000000000000'},organization_id.is.null`)
    .eq('enabled', true);

  const eventKey = `${alert.source}_${alert.severity}`;
  for (const ch of channels ?? []) {
    const events = (ch as { events: string[] }).events ?? [];
    if (events.length > 0 && !events.includes(eventKey) && !events.includes(alert.source)) continue;
    await deliver((ch as { kind: ChannelKind; target: string }).kind, (ch as { target: string }).target, alert);
  }
}

async function deliver(kind: ChannelKind, target: string, alert: OpAlert): Promise<void> {
  try {
    const text = `[${alert.severity.toUpperCase()}] ${alert.title}${alert.message ? ` — ${alert.message}` : ''}`;
    switch (kind) {
      case 'slack':
      case 'discord':
      case 'teams':
      case 'webhook':
        await fetch(target, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(kind === 'slack' ? { text } : { content: text, alert })
        });
        break;
      case 'email':
        // queued via outbox (handled by caller when appropriate)
        break;
    }
  } catch (err) {
    logger.warn('alert delivery failed', { channel: kind, err: (err as Error).message });
  }
}
