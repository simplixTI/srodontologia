/**
 * Placeholder Supabase database types.
 *
 * Regenerate this file with:
 *   supabase gen types typescript --project-id wcxwngfuwwzylcmsgoyu > src/types/database.ts
 *
 * Until then we type against a permissive shape so the app compiles.
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

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
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
        Insert: Partial<Database['public']['Tables']['organizations']['Row']> & {
          name: string;
        };
        Update: Partial<Database['public']['Tables']['organizations']['Row']>;
      };
      profiles: {
        Row: {
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
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & {
          id: string;
          organization_id: string;
          full_name: string;
          email: string;
          role: UserRole;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      audit_logs: {
        Row: {
          id: string;
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
        Insert: Partial<Database['public']['Tables']['audit_logs']['Row']> & {
          action: string;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Row']>;
      };
      consents: {
        Row: {
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
        Insert: Partial<Database['public']['Tables']['consents']['Row']> & {
          user_id: string;
          consent_type: string;
          version: string;
          accepted: boolean;
        };
        Update: Partial<Database['public']['Tables']['consents']['Row']>;
      };
      system_settings: {
        Row: {
          id: string;
          organization_id: string;
          key: string;
          value: Record<string, unknown>;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['system_settings']['Row']> & {
          organization_id: string;
          key: string;
          value: Record<string, unknown>;
        };
        Update: Partial<Database['public']['Tables']['system_settings']['Row']>;
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
  };
};
