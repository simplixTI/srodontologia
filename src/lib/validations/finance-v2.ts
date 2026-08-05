import { z } from 'zod';

export const PAYMENT_METHODS = [
  'pix',
  'boleto',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'cash',
  'other'
] as const;

// ─── Category ─────────────────────────────────────────────
export const categorySchema = z.object({
  name: z.string().min(2).max(120),
  kind: z.enum(['revenue', 'expense']),
  code: z.string().max(20).optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  is_active: z.coerce.boolean().default(true)
});
export type CategoryInput = z.infer<typeof categorySchema>;

export function extractCategoryForm(fd: FormData): Record<string, unknown> {
  return {
    name: fd.get('name'),
    kind: fd.get('kind'),
    code: fd.get('code'),
    parent_id: fd.get('parent_id') || null,
    is_active: fd.get('is_active') !== 'off' && fd.get('is_active') !== 'false'
  };
}

// ─── Cost Center ──────────────────────────────────────────
export const costCenterSchema = z.object({
  name: z.string().min(2).max(120),
  code: z.string().max(20).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  is_active: z.coerce.boolean().default(true)
});
export type CostCenterInput = z.infer<typeof costCenterSchema>;

export function extractCostCenterForm(fd: FormData): Record<string, unknown> {
  return {
    name: fd.get('name'),
    code: fd.get('code'),
    description: fd.get('description'),
    is_active: fd.get('is_active') !== 'off' && fd.get('is_active') !== 'false'
  };
}

// ─── Payable ──────────────────────────────────────────────
export const payableSchema = z.object({
  supplier_name: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  cost_center_id: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().positive(),
  due_date: z.string().min(10),
  external_reference: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable()
});
export type PayableInput = z.infer<typeof payableSchema>;

export function extractPayableForm(fd: FormData): Record<string, unknown> {
  return {
    supplier_name: fd.get('supplier_name'),
    description: fd.get('description'),
    category_id: fd.get('category_id') || null,
    cost_center_id: fd.get('cost_center_id') || null,
    amount: fd.get('amount'),
    due_date: fd.get('due_date'),
    external_reference: fd.get('external_reference'),
    notes: fd.get('notes')
  };
}

export const payPayableSchema = z.object({
  payable_id: z.string().uuid(),
  paid_amount: z.coerce.number().positive(),
  method: z.enum(PAYMENT_METHODS),
  notes: z.string().max(2000).optional().nullable()
});

// ─── Commission ───────────────────────────────────────────
export const commissionSchema = z.object({
  beneficiary_id: z.string().uuid(),
  invoice_id: z.string().uuid().optional().nullable(),
  case_id: z.string().uuid().optional().nullable(),
  base_amount: z.coerce.number().nonnegative(),
  percentage: z.coerce.number().min(0).max(100),
  amount: z.coerce.number().nonnegative(),
  reference_month: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable()
});
export type CommissionInput = z.infer<typeof commissionSchema>;

export const commissionTransitionSchema = z.object({
  commission_id: z.string().uuid(),
  target: z.enum(['approved', 'paid', 'cancelled'])
});

// ─── Transaction ──────────────────────────────────────────
export const txnSchema = z.object({
  kind: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive(),
  txn_date: z.string().min(10),
  category_id: z.string().uuid().optional().nullable(),
  cost_center_id: z.string().uuid().optional().nullable(),
  method: z.enum(PAYMENT_METHODS).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable()
});
