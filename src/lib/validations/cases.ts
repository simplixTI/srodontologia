import { z } from 'zod';

export const CASE_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type CasePriority = (typeof CASE_PRIORITIES)[number];

export const CASE_PRIORITY_LABELS: Record<CasePriority, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente'
};

export const PUBLIC_STATUS_LABELS = {
  draft: 'Rascunho',
  submitted: 'Caso enviado',
  in_review: 'Em análise',
  missing_information: 'Informações pendentes',
  quote_available: 'Orçamento disponível',
  awaiting_your_approval: 'Aguardando aprovação',
  in_planning: 'Em planejamento',
  planning_available: 'Planejamento disponível',
  in_production: 'Em produção',
  quality_control: 'Controle de qualidade',
  preparing_shipment: 'Preparando envio',
  shipped: 'Enviado',
  delivered: 'Entregue',
  completed: 'Finalizado',
  cancelled: 'Cancelado'
} as const;

// Case creation is minimal — user fills in fields incrementally via autosave
export const createCaseSchema = z.object({
  dentist_id: z.string().uuid('Selecione um dentista.'),
  clinic_id: z.string().uuid().optional().or(z.literal('')),
  case_type_id: z.string().uuid().optional().or(z.literal('')),
  title: z.string().min(2, 'Título muito curto.').max(200)
});
export type CreateCaseInput = z.infer<typeof createCaseSchema>;

export const updateCaseSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  dentist_id: z.string().uuid().optional(),
  clinic_id: z.string().uuid().nullable().optional(),
  patient_id: z.string().uuid().nullable().optional(),
  case_type_id: z.string().uuid().nullable().optional(),
  priority: z.enum(CASE_PRIORITIES).optional(),
  clinical_description: z.string().max(5000).nullable().optional(),
  dentist_notes: z.string().max(5000).nullable().optional(),
  internal_notes: z.string().max(5000).nullable().optional(),
  teeth_regions: z.array(z.string()).nullable().optional(),
  material: z.string().max(200).nullable().optional(),
  shade: z.string().max(100).nullable().optional(),
  requested_delivery_date: z.string().nullable().optional(),
  estimated_delivery_date: z.string().nullable().optional(),
  technical_owner_id: z.string().uuid().nullable().optional(),
  production_owner_id: z.string().uuid().nullable().optional()
});
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
