import { registerJobProcessor } from '../registry';
import { processWebhookDeliver } from './webhook';
import { processSearchReindex } from './search';
import { processAutomationRun } from './automation';
import { processEmailSend } from './email';
import { processWhatsappSend } from './whatsapp';
import { processOcrDocument } from './ocr';
import { processAiCaseSummary } from './ai-case-summary';
import { processAiPrazoPrediction } from './ai-prazo-prediction';
import { processAiLabAssistant } from './ai-lab-assistant';
import { processAiDentistAssistant } from './ai-dentist-assistant';
import { processAiImageAnalysis } from './ai-image-analysis';
import { processPdfGenerate } from './pdf';
import { processLgpdExport, processLgpdDeletion } from './lgpd';
import { processDomainVerify } from './domain';
import { processDeviceAlert } from './device-alert';

let bootstrapped = false;

/** Registers every built-in processor exactly once per Node process. */
export function bootstrapProcessors(): void {
  if (bootstrapped) return;
  bootstrapped = true;
  registerJobProcessor('webhook_deliver', processWebhookDeliver);
  registerJobProcessor('search_reindex', processSearchReindex);
  registerJobProcessor('automation_run', processAutomationRun);
  registerJobProcessor('email_send', processEmailSend);
  registerJobProcessor('whatsapp_send', processWhatsappSend);
  registerJobProcessor('ocr_document', processOcrDocument);
  registerJobProcessor('ai_case_summary', processAiCaseSummary);
  registerJobProcessor('ai_prazo_prediction', processAiPrazoPrediction);
  registerJobProcessor('ai_lab_assistant', processAiLabAssistant);
  registerJobProcessor('ai_dentist_assistant', processAiDentistAssistant);
  registerJobProcessor('ai_image_analysis', processAiImageAnalysis);
  registerJobProcessor('pdf_generate_quote', processPdfGenerate);
  registerJobProcessor('pdf_generate_planning', processPdfGenerate);
  registerJobProcessor('pdf_generate_receipt', processPdfGenerate);
  registerJobProcessor('pdf_generate_case_report', processPdfGenerate);
  registerJobProcessor('lgpd_export', processLgpdExport);
  registerJobProcessor('lgpd_deletion', processLgpdDeletion);
  registerJobProcessor('domain_verify', processDomainVerify);
  registerJobProcessor('device_alert', processDeviceAlert);
}
