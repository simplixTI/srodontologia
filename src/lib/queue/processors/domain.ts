import 'server-only';
import type { JobProcessor } from '../types';
import { verifyDomain } from '@/lib/domains/verifier';

export const processDomainVerify: JobProcessor<{ domain_id: string }> = async (job) => {
  const id = job.payload.domain_id;
  if (!id) throw new Error('domain_verify missing domain_id');
  const res = await verifyDomain(id);
  return { status: res.status, error: res.error };
};
