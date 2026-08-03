import type { UserRole } from '@/types/database';
import { ROLES } from './roles';

/**
 * Coarse-grained RBAC helper.
 *
 * These checks are for UI shaping only. Every write path must
 * still be protected server-side via Supabase RLS + server actions.
 */

const alwaysAllowed = new Set<UserRole>([ROLES.SUPER_ADMIN]);

export type Ability =
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
  | 'users.read'
  | 'users.write'
  | 'settings.read'
  | 'settings.write'
  | 'reports.read'
  | 'audit.read';

const abilityMatrix: Record<Ability, UserRole[]> = {
  'crm.read': [ROLES.ADMIN, ROLES.COMMERCIAL],
  'crm.write': [ROLES.ADMIN, ROLES.COMMERCIAL],

  'cases.read': [
    ROLES.ADMIN,
    ROLES.COMMERCIAL,
    ROLES.TECHNICAL_PLANNING,
    ROLES.PRODUCTION,
    ROLES.FINANCE,
    ROLES.LOGISTICS
  ],
  'cases.write': [ROLES.ADMIN, ROLES.TECHNICAL_PLANNING, ROLES.PRODUCTION],
  'cases.assign': [ROLES.ADMIN, ROLES.COMMERCIAL, ROLES.TECHNICAL_PLANNING],

  'planning.read': [ROLES.ADMIN, ROLES.TECHNICAL_PLANNING, ROLES.PRODUCTION],
  'planning.write': [ROLES.ADMIN, ROLES.TECHNICAL_PLANNING],
  'planning.approve': [ROLES.ADMIN, ROLES.TECHNICAL_PLANNING],

  'production.read': [ROLES.ADMIN, ROLES.PRODUCTION, ROLES.TECHNICAL_PLANNING],
  'production.write': [ROLES.ADMIN, ROLES.PRODUCTION],

  'finance.read': [ROLES.ADMIN, ROLES.FINANCE],
  'finance.write': [ROLES.ADMIN, ROLES.FINANCE],

  'deliveries.read': [ROLES.ADMIN, ROLES.LOGISTICS, ROLES.PRODUCTION],
  'deliveries.write': [ROLES.ADMIN, ROLES.LOGISTICS],

  'users.read': [ROLES.ADMIN],
  'users.write': [ROLES.ADMIN],

  'settings.read': [ROLES.ADMIN],
  'settings.write': [ROLES.ADMIN],

  'reports.read': [ROLES.ADMIN, ROLES.COMMERCIAL, ROLES.FINANCE],

  'audit.read': [ROLES.ADMIN]
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
