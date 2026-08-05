import type { UserRole } from '@/types/database';
import { ROLES } from './roles';

/**
 * Coarse-grained RBAC helper para o escritório (tenant).
 *
 * Estes checks são apenas para modelagem de UI. Toda escrita deve
 * ser protegida server-side via RLS + server actions. Administração
 * da plataforma (super_admin) vive em src/lib/permissions/platform.ts.
 *
 * Convenção: role `super_admin` e `admin` são tratados como office admin
 * e recebem acesso a todas as abilities (`alwaysAllowed`).
 */

const alwaysAllowed = new Set<UserRole>([ROLES.SUPER_ADMIN, ROLES.ADMIN]);

export type Ability =
  | 'office.dashboard.read'
  | 'clients.manage'
  | 'crm.read'
  | 'crm.write'
  | 'cases.read'
  | 'cases.write'
  | 'cases.assign'
  | 'planning.read'
  | 'planning.write'
  | 'planning.approve'
  | 'production.read'
  | 'production.write'
  | 'finance.read'
  | 'finance.write'
  | 'deliveries.read'
  | 'deliveries.write'
  | 'schedule.manage'
  | 'messages.manage'
  | 'team.manage'
  | 'users.read'
  | 'users.write'
  | 'office_settings.read'
  | 'office_settings.write'
  | 'office_branding.manage'
  | 'reports.read'
  | 'audit.read';

const abilityMatrix: Record<Ability, UserRole[]> = {
  'office.dashboard.read': [
    ROLES.MANAGER,
    ROLES.COMMERCIAL,
    ROLES.RECEPTION,
    ROLES.TECHNICAL_PLANNING,
    ROLES.PRODUCTION,
    ROLES.FINANCE,
    ROLES.LOGISTICS,
    ROLES.DELIVERY,
    ROLES.VIEWER
  ],

  'clients.manage': [ROLES.MANAGER, ROLES.COMMERCIAL, ROLES.RECEPTION],

  'crm.read': [ROLES.MANAGER, ROLES.COMMERCIAL, ROLES.RECEPTION, ROLES.VIEWER],
  'crm.write': [ROLES.MANAGER, ROLES.COMMERCIAL, ROLES.RECEPTION],

  'cases.read': [
    ROLES.MANAGER,
    ROLES.COMMERCIAL,
    ROLES.RECEPTION,
    ROLES.TECHNICAL_PLANNING,
    ROLES.PRODUCTION,
    ROLES.FINANCE,
    ROLES.LOGISTICS,
    ROLES.DELIVERY,
    ROLES.VIEWER
  ],
  'cases.write': [ROLES.MANAGER, ROLES.TECHNICAL_PLANNING, ROLES.PRODUCTION, ROLES.RECEPTION],
  'cases.assign': [ROLES.MANAGER, ROLES.COMMERCIAL, ROLES.TECHNICAL_PLANNING],

  'planning.read': [ROLES.MANAGER, ROLES.TECHNICAL_PLANNING, ROLES.PRODUCTION],
  'planning.write': [ROLES.MANAGER, ROLES.TECHNICAL_PLANNING],
  'planning.approve': [ROLES.MANAGER, ROLES.TECHNICAL_PLANNING],

  'production.read': [ROLES.MANAGER, ROLES.PRODUCTION, ROLES.TECHNICAL_PLANNING],
  'production.write': [ROLES.MANAGER, ROLES.PRODUCTION],

  'finance.read': [ROLES.MANAGER, ROLES.FINANCE],
  'finance.write': [ROLES.MANAGER, ROLES.FINANCE],

  'deliveries.read': [ROLES.MANAGER, ROLES.LOGISTICS, ROLES.DELIVERY, ROLES.PRODUCTION],
  'deliveries.write': [ROLES.MANAGER, ROLES.LOGISTICS, ROLES.DELIVERY],

  'schedule.manage': [ROLES.MANAGER, ROLES.RECEPTION, ROLES.COMMERCIAL],
  'messages.manage': [ROLES.MANAGER, ROLES.RECEPTION, ROLES.COMMERCIAL],

  'team.manage': [ROLES.MANAGER],

  'users.read': [ROLES.MANAGER],
  'users.write': [ROLES.MANAGER],

  'office_settings.read': [ROLES.MANAGER],
  'office_settings.write': [ROLES.MANAGER],
  'office_branding.manage': [ROLES.MANAGER],

  'reports.read': [ROLES.MANAGER, ROLES.COMMERCIAL, ROLES.FINANCE, ROLES.VIEWER],

  'audit.read': [ROLES.MANAGER]
};

export function can(role: UserRole | null | undefined, ability: Ability): boolean {
  if (!role) return false;
  if (alwaysAllowed.has(role)) return true;
  return abilityMatrix[ability]?.includes(role) ?? false;
}

export function canAny(
  role: UserRole | null | undefined,
  abilities: Ability[]
): boolean {
  return abilities.some((a) => can(role, a));
}
