import 'server-only';
import type { JobProcessor } from '../types';
import { sendWhatsappViaProvider } from '@/lib/integrations/whatsapp/provider';

type WhatsappPayload = {
  to: string;
  template?: string;
  message?: string;
  data?: Record<string, unknown>;
};

export const processWhatsappSend: JobProcessor<WhatsappPayload> = async (job) => {
  const res = await sendWhatsappViaProvider(job.organization_id, job.payload);
  return { sent: true, id: res.id ?? null };
};
