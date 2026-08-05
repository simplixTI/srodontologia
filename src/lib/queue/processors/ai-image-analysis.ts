import 'server-only';
import type { JobProcessor } from '../types';

/**
 * Placeholder for multimodal image analysis. Real implementation depends on
 * a multimodal provider (GPT-4o / Claude Sonnet / Gemini) being configured
 * and image_analysis feature enabled in ai_settings.
 */
export const processAiImageAnalysis: JobProcessor<{ case_file_id: string }> = async (job) => {
  return { note: 'image analysis pending provider config', case_file_id: job.payload.case_file_id };
};
