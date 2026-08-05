import type { UserRole } from '@/types/database';

/**
 * Papéis dentro do escritório (tenant). São distintos do `platform_role`,
 * que administra a plataforma SaaS. Ver src/lib/permissions/platform.ts.
 *
 * Convenção legada:
 *   • `super_admin` = admin proprietário do escritório (nome herdado).
 *   • `admin`       = administrador do escritório (equivalente ao ADMIN
 *                     que a especificação de refatoração de perfis usa).
 * Ambos são mapeados como "office admin" nas RLS e helpers.
 */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  COMMERCIAL: 'commercial',
  RECEPTION: 'reception',
  TECHNICAL_PLANNING: 'technical_planning',
  PRODUCTION: 'production',
  FINANCE: 'finance',
  LOGISTICS: 'logistics',
  DELIVERY: 'delivery',
  VIEWER: 'viewer',
  DENTIST: 'dentist'
} as const satisfies Record<string, UserRole>;

export const INTERNAL_ROLES: UserRole[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.COMMERCIAL,
  ROLES.RECEPTION,
  ROLES.TECHNICAL_PLANNING,
  ROLES.PRODUCTION,
  ROLES.FINANCE,
  ROLES.LOGISTICS,
  ROLES.DELIVERY,
  ROLES.VIEWER
];

export const EXTERNAL_ROLES: UserRole[] = [ROLES.DENTIST];

/** Papéis com privilégios de administração do escritório. */
export const OFFICE_ADMIN_ROLES: UserRole[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Administrador',
  admin: 'Administrador',
  manager: 'Gerente',
  commercial: 'Comercial',
  reception: 'Recepção',
  technical_planning: 'Planejamento Técnico',
  production: 'Produção',
  finance: 'Financeiro',
  logistics: 'Logística',
  delivery: 'Entregas',
  viewer: 'Visualizador',
  dentist: 'Dentista'
};

export function isInternalRole(role: UserRole): boolean {
  return INTERNAL_ROLES.includes(role);
}

export function isExternalRole(role: UserRole): boolean {
  return EXTERNAL_ROLES.includes(role);
}

/** Retorna true se a role é admin do escritório (super_admin ou admin). */
export function isOfficeAdmin(role: UserRole | null | undefined): boolean {
  if (!role) return false;
  return OFFICE_ADMIN_ROLES.includes(role);
}

export function homeRouteForRole(role: UserRole): string {
  return isExternalRole(role) ? '/portal' : '/dashboard';
}
