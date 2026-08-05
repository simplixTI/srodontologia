import 'server-only';
import type { JobProcessor } from '../types';

/**
 * Placeholder — the lab assistant runs synchronously via a server action
 * (see /assistente/*). This processor exists to allow async batch queries
 * (e.g. weekly report generation) in the future.
 */
export const processAiLabAssistant: JobProcessor<{ question: string }> = async (job) => {
  return { note: 'async lab assistant not yet implemented', question: job.payload.question };
};
