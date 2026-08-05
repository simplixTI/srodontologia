import 'server-only';
import type { JobProcessor } from '../types';

/**
 * Placeholder — dentist assistant runs synchronously in the portal.
 * Kept here to allow async warm-up / cache generation later.
 */
export const processAiDentistAssistant: JobProcessor<{ question: string }> = async (job) => {
  return { note: 'async dentist assistant not yet implemented', question: job.payload.question };
};
