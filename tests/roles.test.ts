import { describe, it, expect } from 'vitest';
import {
  ROLES,
  INTERNAL_ROLES,
  EXTERNAL_ROLES,
  OFFICE_ADMIN_ROLES,
  ROLE_LABELS,
  isInternalRole,
  isExternalRole,
  isOfficeAdmin,
  homeRouteForRole
} from '@/lib/permissions/roles';
import { can } from '@/lib/permissions/can';

describe('roles matrix', () => {
  it('inclui as novas roles operacionais adicionadas na refatoração de perfis', () => {
    expect(ROLES.MANAGER).toBe('manager');
    expect(ROLES.RECEPTION).toBe('reception');
    expect(ROLES.DELIVERY).toBe('delivery');
    expect(ROLES.VIEWER).toBe('viewer');

    for (const r of ['manager', 'reception', 'delivery', 'viewer'] as const) {
      expect(INTERNAL_ROLES).toContain(r);
      expect(ROLE_LABELS[r]).toBeTruthy();
    }
  });

  it('mantém dentist como única role externa', () => {
    expect(EXTERNAL_ROLES).toEqual(['dentist']);
    expect(isExternalRole('dentist')).toBe(true);
    expect(isInternalRole('dentist')).toBe(false);
  });

  it('office admin cobre super_admin e admin', () => {
    expect(OFFICE_ADMIN_ROLES).toEqual(['super_admin', 'admin']);
    expect(isOfficeAdmin('super_admin')).toBe(true);
    expect(isOfficeAdmin('admin')).toBe(true);
    expect(isOfficeAdmin('manager')).toBe(false);
    expect(isOfficeAdmin('dentist')).toBe(false);
    expect(isOfficeAdmin(null)).toBe(false);
  });

  it('homeRoute manda dentista pro portal e o resto pro dashboard', () => {
    expect(homeRouteForRole('dentist')).toBe('/portal');
    expect(homeRouteForRole('admin')).toBe('/dashboard');
    expect(homeRouteForRole('manager')).toBe('/dashboard');
    expect(homeRouteForRole('reception')).toBe('/dashboard');
  });
});

describe('can() matrix', () => {
  it('super_admin e admin sempre passam (alwaysAllowed)', () => {
    for (const ability of ['office.dashboard.read', 'cases.write', 'finance.write', 'team.manage'] as const) {
      expect(can('super_admin', ability)).toBe(true);
      expect(can('admin', ability)).toBe(true);
    }
  });

  it('viewer só lê', () => {
    expect(can('viewer', 'office.dashboard.read')).toBe(true);
    expect(can('viewer', 'reports.read')).toBe(true);
    expect(can('viewer', 'cases.read')).toBe(true);
    expect(can('viewer', 'cases.write')).toBe(false);
    expect(can('viewer', 'finance.write')).toBe(false);
    expect(can('viewer', 'team.manage')).toBe(false);
  });

  it('recepção mexe em agenda e mensagens mas não em produção/financeiro', () => {
    expect(can('reception', 'schedule.manage')).toBe(true);
    expect(can('reception', 'messages.manage')).toBe(true);
    expect(can('reception', 'crm.write')).toBe(true);
    expect(can('reception', 'production.write')).toBe(false);
    expect(can('reception', 'finance.write')).toBe(false);
  });

  it('finance vê e edita financeiro; não toca em produção', () => {
    expect(can('finance', 'finance.read')).toBe(true);
    expect(can('finance', 'finance.write')).toBe(true);
    expect(can('finance', 'production.write')).toBe(false);
    expect(can('finance', 'planning.write')).toBe(false);
  });

  it('delivery gerencia entregas', () => {
    expect(can('delivery', 'deliveries.read')).toBe(true);
    expect(can('delivery', 'deliveries.write')).toBe(true);
    expect(can('delivery', 'cases.write')).toBe(false);
    expect(can('delivery', 'finance.read')).toBe(false);
  });

  it('dentist não tem abilities do escritório', () => {
    expect(can('dentist', 'office.dashboard.read')).toBe(false);
    expect(can('dentist', 'cases.write')).toBe(false);
    expect(can('dentist', 'team.manage')).toBe(false);
  });

  it('role ausente rejeita tudo', () => {
    expect(can(null, 'reports.read')).toBe(false);
    expect(can(undefined, 'reports.read')).toBe(false);
  });
});
