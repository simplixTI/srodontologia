export type OcrTarget = 'document' | 'clinical_form' | 'receipt';

export type OcrFields = {
  patient_name?: string;
  patient_cpf?: string;
  dentist_name?: string;
  request_date?: string;
  procedures?: string[];
  teeth?: string[];
  observations?: string;
  work_type?: string;
  [key: string]: unknown;
};

export type OcrRunInput = {
  organizationId: string;
  caseId: string | null;
  file: {
    id: string;
    storage_path: string;
    mime_type: string | null;
    file_name: string;
    original_name: string;
    extension: string;
  };
  target: OcrTarget;
};

export type OcrRunResult = {
  rawText: string;
  fields: OcrFields;
  confidence: number;
  provider: string;
  model: string;
};

export type OcrProvider = {
  id: string;
  displayName: string;
  extract(input: OcrRunInput, opts: { fileBuffer: ArrayBuffer }): Promise<OcrRunResult>;
};
