import { describe, it, expect } from 'vitest';
import { ENTITIES, getEntity, dentistsRowSchema, clinicsRowSchema, patientsRowSchema, casesRowSchema } from '../src/lib/import/entities';

describe('import entities · registry', () => {
  it('has all 4 entities', () => {
    expect(Object.keys(ENTITIES).sort()).toEqual(['cases', 'clinics', 'dentists', 'patients']);
  });

  it('getEntity returns null for unknown key', () => {
    expect(getEntity('unknown_x')).toBe(null);
  });

  it('templates start with the header row', () => {
    for (const e of Object.values(ENTITIES)) {
      const firstLine = e.templateCsv.split('\n')[0];
      expect(firstLine).toBe(e.headers.join(','));
    }
  });
});

describe('dentistsRowSchema', () => {
  it('accepts a full valid row', () => {
    const r = dentistsRowSchema.safeParse({
      full_name: '  Dr. Fulano ',
      email: '  FULANO@EX.COM ',
      phone: '(11) 98765-4321',
      cro: '12345',
      cro_uf: 'sp',
      clinic_name: 'Clínica X'
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.full_name).toBe('Dr. Fulano');
      expect(r.data.email).toBe('fulano@ex.com');
      expect(r.data.phone).toBe('11987654321');
      expect(r.data.cro_uf).toBe('SP');
    }
  });

  it('rejects invalid email', () => {
    const r = dentistsRowSchema.safeParse({ full_name: 'X', email: 'not-an-email' });
    expect(r.success).toBe(false);
  });

  it('rejects short name', () => {
    const r = dentistsRowSchema.safeParse({ full_name: 'A', email: 'x@y.com' });
    expect(r.success).toBe(false);
  });

  it('rejects invalid UF', () => {
    const r = dentistsRowSchema.safeParse({ full_name: 'X Y', email: 'x@y.com', cro_uf: 'XXX' });
    expect(r.success).toBe(false);
  });
});

describe('clinicsRowSchema', () => {
  it('accepts minimum required fields', () => {
    const r = clinicsRowSchema.safeParse({ name: 'Clínica' });
    expect(r.success).toBe(true);
  });
});

describe('patientsRowSchema', () => {
  it('accepts YYYY-MM-DD birth_date', () => {
    const r = patientsRowSchema.safeParse({ full_name: 'João', birth_date: '1980-05-10' });
    expect(r.success).toBe(true);
  });
  it('rejects malformed date', () => {
    const r = patientsRowSchema.safeParse({ full_name: 'João', birth_date: '10/05/1980' });
    expect(r.success).toBe(false);
  });
});

describe('casesRowSchema', () => {
  it('accepts full valid case', () => {
    const r = casesRowSchema.safeParse({
      external_id: 'CASO-001',
      patient_name: 'Paciente Um',
      dentist_email: 'd@ex.com',
      work_type: 'Coroa'
    });
    expect(r.success).toBe(true);
  });
  it('rejects missing dentist_email', () => {
    const r = casesRowSchema.safeParse({
      patient_name: 'Paciente Um',
      dentist_email: '',
      work_type: 'Coroa'
    });
    expect(r.success).toBe(false);
  });
});
