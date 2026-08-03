import type { UserRole } from '@/types/database';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  COMMERCIAL: 'commercial',
  TECHNICAL_PLANNING: 'technical_planning',
  PRODUCTION: 'production',
  FINANCE: 'finance',
  LOGISTICS: 'logistics',
  DENTIST: 'dentist'
} as const satisfies Record<string, UserRole>;

export const INTERNAL_ROLES: UserRole[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.COMMERCIAL,
  ROLES.TECHNICAL_PLANNING,
  ROLES.PRODUCTION,
  ROLES.FINANCE,
  ROLES.LOGISTICS
];

export const EXTERNAL_ROLES: UserRole[] = [ROLES.DENTIST];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Administrador',
  admin: 'Administrador',
  commercial: 'Comercial',
  technical_planning: 'Planejamento Técnico',
  production: 'Produção',
  finance: 'Financeiro',
  logistics: 'Logística',
  dentist: 'Dentista'
};

export function isInternalRole(role: UserRole): boolean {
  return INTERNAL_ROLES.includes(role);
}

export function isExternalRole(role: UserRole): boolean {
  return EXTERNAL_ROLES.includes(role);
}

export function homeRouteForRole(role: UserRole): string {
  return isExternalRole(role) ? '/portal' : '/dashboard';
}
