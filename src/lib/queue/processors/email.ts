import 'server-only';
import type { JobProcessor } from '../types';
import { sendEmailViaProvider } from '@/lib/integrations/email/provider';

type EmailPayload = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  data?: Record<string, unknown>;
};

export const processEmailSend: JobProcessor<EmailPayload> = async (job) => {
  const res = await sendEmailViaProvider(job.organization_id, job.payload);
  return { sent: true, id: res.id ?? null };
};
