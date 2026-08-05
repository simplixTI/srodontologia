import { z } from 'zod';

/**
 * Registry of importable entities. Each entity declares:
 *   - headers: expected CSV columns
 *   - schema:  Zod validator applied per row
 *   - dedupeKeys: which parsed fields identify a duplicate
 *   - target:  Supabase table (writes via admin client in orchestrator)
 *   - templateCsv: sample content served by the "download template" button
 *
 * All schemas normalize the input into a shape that can be `insert`-ed
 * directly (after adding organization_id + created_at). Never trust the
 * CSV to provide FK ids — we resolve those inside the orchestrator by
 * name/email lookup so a spreadsheet-authored file can reference clinics
 * or dentists by human labels.
 */

export type ImportEntityKey = 'clinics' | 'dentists' | 'patients' | 'cases';

const cpfRegex = /^\d{11}$/;
const brPhoneRegex = /^\d{10,11}$/;

const cleanDigits = (v: string | undefined) => (v ?? '').replace(/\D+/g, '');
const emailNorm = (v: string | undefined) => (v ?? '').trim().toLowerCase();
const trimStr   = (v: string | undefined) => (v ?? '').trim();

export const CLINICS_HEADERS = ['name', 'email', 'phone', 'city', 'state'] as const;
export const clinicsRowSchema = z.object({
  name: z.string().transform(trimStr).pipe(z.string().min(2, 'Nome obrigatório')),
  email: z.string().transform(emailNorm).refine((v) => v === '' || /.+@.+\..+/.test(v), 'E-mail inválido').optional(),
  phone: z.string().transform(cleanDigits).refine((v) => v === '' || brPhoneRegex.test(v), 'Telefone inválido').optional(),
  city: z.string().transform(trimStr).optional(),
  state: z.string().transform((v) => (v ?? '').trim().toUpperCase()).refine((v) => v === '' || /^[A-Z]{2}$/.test(v), 'UF inválida').optional()
});

export const DENTISTS_HEADERS = ['full_name', 'email', 'phone', 'cro', 'cro_uf', 'clinic_name'] as const;
export const dentistsRowSchema = z.object({
  full_name: z.string().transform(trimStr).pipe(z.string().min(2, 'Nome obrigatório')),
  email:     z.string().transform(emailNorm).pipe(z.string().email('E-mail inválido')),
  phone:     z.string().transform(cleanDigits).refine((v) => v === '' || brPhoneRegex.test(v), 'Telefone inválido').optional(),
  cro:       z.string().transform(cleanDigits).refine((v) => v === '' || /^\d{4,7}$/.test(v), 'CRO inválido').optional(),
  cro_uf:    z.string().transform((v) => (v ?? '').trim().toUpperCase()).refine((v) => v === '' || /^[A-Z]{2}$/.test(v), 'UF inválida').optional(),
  clinic_name: z.string().transform(trimStr).optional()
});

export const PATIENTS_HEADERS = ['full_name', 'external_id', 'birth_date', 'clinic_name', 'dentist_email'] as const;
export const patientsRowSchema = z.object({
  full_name:     z.string().transform(trimStr).pipe(z.string().min(2, 'Nome obrigatório')),
  external_id:   z.string().transform(trimStr).optional(),
  birth_date:    z.string().transform(trimStr).refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Data inválida (YYYY-MM-DD)').optional(),
  clinic_name:   z.string().transform(trimStr).optional(),
  dentist_email: z.string().transform(emailNorm).optional()
});

export const CASES_HEADERS = ['external_id', 'patient_name', 'dentist_email', 'clinic_name', 'work_type', 'opened_at', 'due_at', 'public_notes'] as const;
export const casesRowSchema = z.object({
  external_id:   z.string().transform(trimStr).optional(),
  patient_name:  z.string().transform(trimStr).pipe(z.string().min(2, 'Paciente obrigatório')),
  dentist_email: z.string().transform(emailNorm).pipe(z.string().email('E-mail do dentista inválido')),
  clinic_name:   z.string().transform(trimStr).optional(),
  work_type:     z.string().transform(trimStr).pipe(z.string().min(2, 'Tipo obrigatório')),
  opened_at:     z.string().transform(trimStr).refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Data inválida').optional(),
  due_at:        z.string().transform(trimStr).refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Data inválida').optional(),
  public_notes:  z.string().transform(trimStr).optional()
});

export type EntityDefinition = {
  key: ImportEntityKey;
  label: string;
  headers: readonly string[];
  target: string;
  dedupeKeys: readonly string[];
  templateCsv: string;
  schema: z.ZodTypeAny;
};

export const ENTITIES: Record<ImportEntityKey, EntityDefinition> = {
  clinics: {
    key: 'clinics',
    label: 'Clínicas',
    headers: CLINICS_HEADERS,
    target: 'clinics',
    dedupeKeys: ['name', 'email'],
    schema: clinicsRowSchema,
    templateCsv: [
      CLINICS_HEADERS.join(','),
      'Clínica Exemplo,contato@clinica.com,11987654321,São Paulo,SP'
    ].join('\n')
  },
  dentists: {
    key: 'dentists',
    label: 'Dentistas',
    headers: DENTISTS_HEADERS,
    target: 'dentists',
    dedupeKeys: ['email', 'cro'],
    schema: dentistsRowSchema,
    templateCsv: [
      DENTISTS_HEADERS.join(','),
      'Dr. Fulano,fulano@ex.com,11987654321,12345,SP,Clínica Exemplo'
    ].join('\n')
  },
  patients: {
    key: 'patients',
    label: 'Pacientes',
    headers: PATIENTS_HEADERS,
    target: 'patients',
    dedupeKeys: ['full_name', 'external_id'],
    schema: patientsRowSchema,
    templateCsv: [
      PATIENTS_HEADERS.join(','),
      'Paciente Exemplo,PAC-001,1980-05-10,Clínica Exemplo,fulano@ex.com'
    ].join('\n')
  },
  cases: {
    key: 'cases',
    label: 'Casos',
    headers: CASES_HEADERS,
    target: 'cases',
    dedupeKeys: ['external_id'],
    schema: casesRowSchema,
    templateCsv: [
      CASES_HEADERS.join(','),
      'CASO-001,Paciente Exemplo,fulano@ex.com,Clínica Exemplo,Coroa,2026-01-15,2026-02-01,Observações públicas'
    ].join('\n')
  }
};

export function getEntity(key: string): EntityDefinition | null {
  return (ENTITIES as Record<string, EntityDefinition>)[key] ?? null;
}
