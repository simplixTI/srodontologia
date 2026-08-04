import { z } from 'zod';

export const CHECKLIST_CATEGORIES = [
  'stl',
  'obj',
  'dicom_tomography',
  'intraoral_photo',
  'extraoral_photo',
  'xray',
  'planning',
  'material_spec',
  'shade',
  'notes',
  'bite_registration',
  'other'
] as const;

export type ChecklistCategory = (typeof CHECKLIST_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  stl: 'STL / mesh',
  obj: 'OBJ / mesh',
  dicom_tomography: 'Tomografia DICOM',
  intraoral_photo: 'Foto intraoral',
  extraoral_photo: 'Foto extraoral',
  xray: 'Radiografia',
  planning: 'Planejamento',
  material_spec: 'Material',
  shade: 'Cor / escala',
  notes: 'Observação / texto',
  bite_registration: 'Registro de mordida',
  other: 'Outro'
};

// Categories that don't need file uploads (text/spec fields)
export const TEXT_ONLY_CATEGORIES: ChecklistCategory[] = [
  'shade',
  'material_spec',
  'notes'
];

// ---------- case_types ----------

export const caseTypeSchema = z.object({
  code: z
    .string()
    .min(2, 'Código muito curto.')
    .max(64, 'Máximo 64 caracteres.')
    .regex(/^[A-Z0-9_]+$/, 'Use apenas MAIÚSCULAS, números e _'),
  name: z.string().min(2, 'Nome muito curto.').max(120),
  description: z.string().max(500).optional().or(z.literal('')),
  icon: z.string().max(64).optional().or(z.literal('')),
  active: z.coerce.boolean(),
  sort_order: z.coerce.number().int().min(0).max(9999)
});
export type CaseTypeInput = z.infer<typeof caseTypeSchema>;

// ---------- templates ----------

export const templateItemSchema = z
  .object({
    case_type_id: z.string().uuid(),
    code: z
      .string()
      .max(64)
      .regex(/^[A-Z0-9_]*$/, 'Use apenas MAIÚSCULAS, números e _')
      .optional()
      .or(z.literal('')),
    title: z.string().min(2, 'Título muito curto.').max(120),
    description: z.string().max(500).optional().or(z.literal('')),
    category: z.enum(CHECKLIST_CATEGORIES),
    required: z.coerce.boolean(),
    sort_order: z.coerce.number().int().min(0).max(9999),
    accepted_file_types: z
      .string()
      .transform((s) =>
        s
          .split(/[,\s]+/)
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean)
      )
      .pipe(z.array(z.string()).max(20)),
    minimum_files: z.coerce.number().int().min(0).max(50),
    maximum_files: z.coerce.number().int().min(0).max(50)
  })
  .refine((v) => v.maximum_files >= v.minimum_files, {
    path: ['maximum_files'],
    message: 'Máximo deve ser ≥ mínimo.'
  });
export type TemplateItemInput = z.infer<typeof templateItemSchema>;
