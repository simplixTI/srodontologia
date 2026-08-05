import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { predictLeadTimeDays } from '@/lib/prazo/predictor';
import type { JobProcessor } from '../types';

type Payload = { case_id: string };

export const processAiPrazoPrediction: JobProcessor<Payload> = async (job) => {
  const admin = createSupabaseAdminClient();
  const { case_id } = job.payload;
  if (!case_id) throw new Error('ai_prazo_prediction missing case_id');

  const prediction = await predictLeadTimeDays(job.organization_id, case_id);
  await admin
    .from('cases')
    .update({ estimated_delivery_date: prediction.estimatedDeliveryDate })
    .eq('id', case_id);

  return { estimated_days: prediction.estimatedDays, confidence: prediction.confidence };
};
