-- =============================================================
-- 0012 · case_types
-- One row per work type (Protocolo, Coroa, Guia, Faceta, etc.).
-- Fully parameterized — never hard-code case types in the app.
-- =============================================================

create table if not exists public.case_types (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code            text not null,                    -- e.g. 'PROTOCOLO_IMPLANTE'
  name            text not null,                    -- display name
  description     text,
  icon            text,                              -- lucide icon name (optional)
  active          boolean not null default true,
  sort_order      integer not null default 0,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

drop trigger if exists trg_case_types_updated_at on public.case_types;
create trigger trg_case_types_updated_at
before update on public.case_types
for each row execute function public.set_updated_at();

create index if not exists case_types_org_active_idx
  on public.case_types (organization_id, active, sort_order);

alter table public.case_types enable row level security;
alter table public.case_types force row level security;

drop policy if exists "case_types_select_org"       on public.case_types;
drop policy if exists "case_types_select_dentist"   on public.case_types;
drop policy if exists "case_types_write_admin"      on public.case_types;

-- Internal staff read everything in their org
create policy "case_types_select_org"
on public.case_types for select
to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

-- Dentists can read active case types of their org (needed to submit new cases)
create policy "case_types_select_dentist"
on public.case_types for select
to authenticated
using (
  organization_id = public.current_user_organization_id()
  and active = true
  and public.current_user_role() = 'dentist'
);

-- Only admin/super_admin can create/update/delete case types
create policy "case_types_write_admin"
on public.case_types for all
to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin')
);
