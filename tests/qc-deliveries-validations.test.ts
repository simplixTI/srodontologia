import { describe, it, expect } from 'vitest';
import {
  qcChecklistSchema,
  qcChecklistItemSchema,
  inspectionCreateSchema,
  inspectionItemUpdateSchema,
  finalizeInspectionSchema,
  extractQcChecklistForm
} from '../src/lib/validations/qc';
import {
  driverSchema,
  carrierSchema,
  routeSchema,
  manifestCreateSchema,
  manifestTransitionSchema,
  incidentSchema,
  extractDriverForm,
  extractCarrierForm,
  extractRouteForm
} from '../src/lib/validations/deliveries-v2';

const UUID = '00000000-0000-0000-0000-000000000001';

describe('QC validations', () => {
  it('checklist requires min name', () => {
    expect(qcChecklistSchema.safeParse({ name: 'a' }).success).toBe(false);
    expect(qcChecklistSchema.parse({ name: 'Ok Name' }).is_active).toBe(true);
  });

  it('extractQcChecklistForm reads is_default', () => {
    const fd = new FormData();
    fd.set('name', 'Padrão');
    fd.set('is_default', 'on');
    const parsed = qcChecklistSchema.parse(extractQcChecklistForm(fd));
    expect(parsed.is_default).toBe(true);
    expect(parsed.is_active).toBe(true);
  });

  it('checklist item requires uuid and label', () => {
    expect(qcChecklistItemSchema.safeParse({ checklist_id: UUID, label: 'A' }).success).toBe(false);
    expect(
      qcChecklistItemSchema.parse({ checklist_id: UUID, label: 'Item ok' }).is_critical
    ).toBe(false);
  });

  it('inspectionCreateSchema accepts case_id only', () => {
    expect(inspectionCreateSchema.parse({ case_id: UUID }).case_id).toBe(UUID);
    expect(inspectionCreateSchema.safeParse({ case_id: 'no' }).success).toBe(false);
  });

  it.each(['pending', 'pass', 'fail', 'na'] as const)('inspectionItemUpdate accepts %s', (r) => {
    const parsed = inspectionItemUpdateSchema.parse({ item_id: UUID, result: r });
    expect(parsed.result).toBe(r);
  });

  it('finalizeInspectionSchema requires uuid', () => {
    expect(finalizeInspectionSchema.parse({ inspection_id: UUID }).inspection_id).toBe(UUID);
    expect(finalizeInspectionSchema.safeParse({ inspection_id: 'x' }).success).toBe(false);
  });
});

describe('Deliveries v2 validations', () => {
  describe('driverSchema', () => {
    it('accepts minimal payload', () => {
      const parsed = driverSchema.parse({ full_name: 'João da Silva' });
      expect(parsed.status).toBe('active');
    });

    it('rejects short name', () => {
      expect(driverSchema.safeParse({ full_name: 'a' }).success).toBe(false);
    });

    it('extractDriverForm builds valid payload', () => {
      const fd = new FormData();
      fd.set('full_name', 'Ana Costa');
      fd.set('phone', '11999999999');
      fd.set('status', 'vacation');
      const parsed = driverSchema.parse(extractDriverForm(fd));
      expect(parsed.status).toBe('vacation');
    });
  });

  describe('carrierSchema', () => {
    it('accepts valid email', () => {
      const parsed = carrierSchema.parse({
        name: 'Transp X',
        email: 'contato@transp.com'
      });
      expect(parsed.email).toBe('contato@transp.com');
    });

    it('rejects malformed email', () => {
      expect(
        carrierSchema.safeParse({ name: 'X', email: 'not-email' }).success
      ).toBe(false);
    });

    it('extractCarrierForm handles empty email', () => {
      const fd = new FormData();
      fd.set('name', 'Sedex');
      const raw = extractCarrierForm(fd);
      expect((raw as { email?: unknown }).email).toBeNull();
    });
  });

  describe('routeSchema', () => {
    it('accepts payload', () => {
      const parsed = routeSchema.parse({ name: 'Zona Sul' });
      expect(parsed.is_active).toBe(true);
    });

    it('extractRouteForm', () => {
      const fd = new FormData();
      fd.set('name', 'Centro');
      fd.set('is_active', 'on');
      const parsed = routeSchema.parse(extractRouteForm(fd));
      expect(parsed.is_active).toBe(true);
    });
  });

  describe('manifestCreateSchema', () => {
    it('accepts empty object (all optional)', () => {
      expect(manifestCreateSchema.parse({}).route_id).toBeUndefined();
    });

    it('rejects non-uuid route_id', () => {
      expect(manifestCreateSchema.safeParse({ route_id: 'x' }).success).toBe(false);
    });
  });

  describe('manifestTransitionSchema', () => {
    it.each(['ready', 'dispatched', 'in_transit', 'completed', 'cancelled'] as const)(
      'accepts %s',
      (t) => {
        expect(
          manifestTransitionSchema.parse({ manifest_id: UUID, target: t }).target
        ).toBe(t);
      }
    );

    it('rejects invalid target', () => {
      expect(
        manifestTransitionSchema.safeParse({ manifest_id: UUID, target: 'draft' }).success
      ).toBe(false);
    });
  });

  describe('incidentSchema', () => {
    it.each(['delay', 'damage', 'lost', 'wrong_address', 'return', 'other'] as const)(
      'accepts kind %s',
      (k) => {
        expect(
          incidentSchema.parse({
            severity: 'warning',
            kind: k,
            description: 'Ocorrência'
          }).kind
        ).toBe(k);
      }
    );

    it('rejects short description', () => {
      expect(
        incidentSchema.safeParse({
          severity: 'warning',
          kind: 'delay',
          description: 'x'
        }).success
      ).toBe(false);
    });
  });
});
