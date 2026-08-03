-- =============================================================
-- 0001 · Extensions and enums
-- =============================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- User roles across the platform
do $$ begin
  create type public.user_role as enum (
    'super_admin',
    'admin',
    'commercial',
    'technical_planning',
    'production',
    'finance',
    'logistics',
    'dentist'
  );
exception when duplicate_object then null; end $$;

-- Lifecycle of any account
do $$ begin
  create type public.user_status as enum (
    'active',
    'invited',
    'suspended',
    'archived'
  );
exception when duplicate_object then null; end $$;
