/**
 * Placeholder Supabase database types (Phase 1).
 *
 * Regenerate later with:
 *   supabase gen types typescript --project-id wcxwngfuwwzylcmsgoyu > src/types/database.ts
 *
 * Uses concrete non-recursive row/insert/update types so TypeScript can
 * fully infer .select/.update/.insert results at the call site.
 */

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'commercial'
  | 'technical_planning'
  | 'production'
  | 'finance'
  | 'logistics'
  | 'dentist';

export type UserStatus = 'active' | 'invited' | 'suspended' | 'archived';

type OrganizationRow = {
  id: string;
  name: string;
  legal_name: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  logo_url: string | null;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type OrganizationInsert = {
  id?: string;
  name: string;
  legal_name?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  logo_url?: string | null;
  settings?: Record<string, unknown> | null;
};

type OrganizationUpdate = Partial<OrganizationInsert>;

type ProfileRow = {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileInsert = {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  avatar_url?: string | null;
  status?: UserStatus;
  must_change_password?: boolean;
  last_login_at?: string | null;
};

type ProfileUpdate = {
  organization_id?: string;
  full_name?: string;
  email?: string;
  phone?: string | null;
  avatar_url?: string | null;
  role?: UserRole;
  status?: UserStatus;
  must_change_password?: boolean;
  last_login_at?: string | null;
};

type AuditLogRow = {
  id: number;
  organization_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

type AuditLogInsert = {
  organization_id?: string | null;
  user_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  previous_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
};

type ConsentRow = {
  id: string;
  organization_id: string | null;
  user_id: string;
  consent_type: string;
  version: string;
  accepted: boolean;
  ip_address: string | null;
  user_agent: string | null;
  accepted_at: string;
};

type ConsentInsert = {
  organization_id?: string | null;
  user_id: string;
  consent_type: string;
  version: string;
  accepted: boolean;
  ip_address?: string | null;
  user_agent?: string | null;
};

type SystemSettingsRow = {
  id: string;
  organization_id: string;
  key: string;
  value: Record<string, unknown>;
  updated_by: string | null;
  updated_at: string;
};

type SystemSettingsInsert = {
  id?: string;
  organization_id: string;
  key: string;
  value: Record<string, unknown>;
  updated_by?: string | null;
};

type SystemSettingsUpdate = Partial<SystemSettingsInsert>;

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: OrganizationRow;
        Insert: OrganizationInsert;
        Update: OrganizationUpdate;
        Relationships: never[];
      };
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: never[];
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: AuditLogInsert;
        Update: Partial<AuditLogInsert>;
        Relationships: never[];
      };
      consents: {
        Row: ConsentRow;
        Insert: ConsentInsert;
        Update: Partial<ConsentInsert>;
        Relationships: never[];
      };
      system_settings: {
        Row: SystemSettingsRow;
        Insert: SystemSettingsInsert;
        Update: SystemSettingsUpdate;
        Relationships: never[];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_user_organization_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      current_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      is_internal_user: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_super_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      user_status: UserStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
