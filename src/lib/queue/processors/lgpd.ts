import 'server-only';
import type { JobProcessor } from '../types';
import { processExportRequest } from '@/lib/lgpd/export-processor';
import { processDeletionRequest } from '@/lib/lgpd/deletion-processor';

export const processLgpdExport: JobProcessor<{ request_id: string }> = async (job) => {
  const id = job.payload.request_id;
  if (!id) throw new Error('lgpd_export missing request_id');
  await processExportRequest(id);
  return { export_id: id };
};

export const processLgpdDeletion: JobProcessor<{ request_id: string }> = async (job) => {
  const id = job.payload.request_id;
  if (!id) throw new Error('lgpd_deletion missing request_id');
  await processDeletionRequest(id);
  return { deletion_id: id };
};
