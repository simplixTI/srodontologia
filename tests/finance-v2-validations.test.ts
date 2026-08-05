import { describe, it, expect } from 'vitest';
import {
  categorySchema,
  costCenterSchema,
  payableSchema,
  payPayableSchema,
  commissionSchema,
  commissionTransitionSchema,
  txnSchema,
  extractCategoryForm,
  extractCostCenterForm,
  extractPayableForm
} from '../src/lib/validations/finance-v2';

const UUID = '00000000-0000-0000-0000-000000000001';

describe('Finance v2 validations', () => {
  describe('categorySchema', () => {
    it('accepts valid revenue', () => {
      const parsed = categorySchema.parse({ name: 'Vendas', kind: 'revenue' });
      expect(parsed.is_active).toBe(true);
    });

    it('rejects invalid kind', () => {
      expect(categorySchema.safeParse({ name: 'X', kind: 'invalid' }).success).toBe(false);
    });

    it('extractCategoryForm reads is_active default true', () => {
      const fd = new FormData();
      fd.set('name', 'Alimentação');
      fd.set('kind', 'expense');
      const raw = extractCategoryForm(fd);
      const parsed = categorySchema.parse(raw);
      expect(parsed.is_active).toBe(true);
    });
  });

  describe('costCenterSchema', () => {
    it('accepts minimal', () => {
      const parsed = costCenterSchema.parse({ name: 'Produção' });
      expect(parsed.is_active).toBe(true);
    });

    it('extractCostCenterForm', () => {
      const fd = new FormData();
      fd.set('name', 'Comercial');
      const parsed = costCenterSchema.parse(extractCostCenterForm(fd));
      expect(parsed.name).toBe('Comercial');
    });
  });

  describe('payableSchema', () => {
    it('accepts complete payload', () => {
      const parsed = payableSchema.parse({
        supplier_name: 'Fornecedor XYZ',
        amount: 1500.5,
        due_date: '2026-09-15'
      });
      expect(parsed.amount).toBe(1500.5);
    });

    it('rejects negative amount', () => {
      expect(
        payableSchema.safeParse({
          supplier_name: 'X',
          amount: -100,
          due_date: '2026-01-01'
        }).success
      ).toBe(false);
    });

    it('extractPayableForm coerces amount', () => {
      const fd = new FormData();
      fd.set('supplier_name', 'Fornec');
      fd.set('amount', '250.99');
      fd.set('due_date', '2026-10-01');
      const parsed = payableSchema.parse(extractPayableForm(fd));
      expect(parsed.amount).toBe(250.99);
    });
  });

  describe('payPayableSchema', () => {
    it('accepts valid payment', () => {
      const parsed = payPayableSchema.parse({
        payable_id: UUID,
        paid_amount: 100,
        method: 'pix'
      });
      expect(parsed.method).toBe('pix');
    });

    it('rejects invalid method', () => {
      expect(
        payPayableSchema.safeParse({
          payable_id: UUID,
          paid_amount: 100,
          method: 'crypto'
        }).success
      ).toBe(false);
    });
  });

  describe('commissionSchema', () => {
    it('accepts valid commission', () => {
      const parsed = commissionSchema.parse({
        beneficiary_id: UUID,
        base_amount: 1000,
        percentage: 10,
        amount: 100
      });
      expect(parsed.percentage).toBe(10);
    });

    it('rejects percentage > 100', () => {
      expect(
        commissionSchema.safeParse({
          beneficiary_id: UUID,
          base_amount: 1000,
          percentage: 150,
          amount: 100
        }).success
      ).toBe(false);
    });
  });

  describe('commissionTransitionSchema', () => {
    it.each(['approved', 'paid', 'cancelled'] as const)('accepts %s', (t) => {
      const parsed = commissionTransitionSchema.parse({
        commission_id: UUID,
        target: t
      });
      expect(parsed.target).toBe(t);
    });
  });

  describe('txnSchema', () => {
    it('accepts income', () => {
      const parsed = txnSchema.parse({
        kind: 'income',
        amount: 500,
        txn_date: '2026-08-05'
      });
      expect(parsed.kind).toBe('income');
    });

    it('rejects zero amount', () => {
      expect(
        txnSchema.safeParse({
          kind: 'income',
          amount: 0,
          txn_date: '2026-08-05'
        }).success
      ).toBe(false);
    });
  });
});
