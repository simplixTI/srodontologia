export const JOB_KINDS = [
  'ocr_document',
  'ai_case_summary',
  'ai_image_analysis',
  'ai_lab_assistant',
  'ai_dentist_assistant',
  'ai_prazo_prediction',
  'pdf_generate_quote',
  'pdf_generate_planning',
  'pdf_generate_receipt',
  'pdf_generate_case_report',
  'webhook_deliver',
  'email_send',
  'whatsapp_send',
  'search_reindex',
  'automation_run',
  'lgpd_export',
  'lgpd_deletion',
  'domain_verify',
  'domain_revalidate',
  'device_alert',
  'csv_import',
  'billing_reconcile'
] as const;

export type JobKind = (typeof JOB_KINDS)[number];

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type Job<TPayload = Record<string, unknown>> = {
  id: string;
  organization_id: string;
  kind: JobKind;
  status: JobStatus;
  priority: number;
  payload: TPayload;
  result: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  max_attempts: number;
  run_after: string;
  case_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type JobProcessor<TPayload = Record<string, unknown>> = (
  job: Job<TPayload>
) => Promise<Record<string, unknown> | void>;

export type EnqueueJobOptions = {
  organizationId: string;
  kind: JobKind;
  payload?: Record<string, unknown>;
  caseId?: string | null;
  runAfter?: Date | string | null;
  priority?: number;
  maxAttempts?: number;
  createdBy?: string | null;
};
