-- =============================================================
-- 0004 · profiles
-- Mirrors auth.users. All app-level authorization is anchored here.
-- =============================================================

create table if not exists public.profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  organization_id        uuid not null references public.organizations(id) on delete restrict,
  full_name              text not null,
  email                  citext not null unique,
  phone                  text,
  avatar_url             text,
  role                   public.user_role not null,
  status                 public.user_status not null default 'active',
  must_change_password   boolean not null default false,
  last_login_at          timestamptz,
  created_at             timestamptz not null default timezone('utc', now()),
  updated_at             timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create index if not exists profiles_organization_idx on public.profiles (organization_id);
create index if not exists profiles_role_idx         on public.profiles (role);
create index if not exists profiles_status_idx       on public.profiles (status);
