-- =============================================================
-- 0003 · organizations
-- Multitenancy root. Every business entity is scoped by organization_id.
-- =============================================================

create table if not exists public.organizations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  legal_name   text,
  document     text unique,
  email        citext,
  phone        text,
  whatsapp     text,
  address      text,
  logo_url     text,
  settings     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default timezone('utc', now()),
  updated_at   timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create index if not exists organizations_name_idx on public.organizations (name);
