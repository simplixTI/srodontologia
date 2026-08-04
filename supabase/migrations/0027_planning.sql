-- =============================================================
-- 0027 · planning_versions + planning_files + planning_actions
-- Approved versions are immutable
-- =============================================================

do $$ begin
  create type public.planning_status as enum (
    'draft', 'sent', 'approved', 'changes_requested', 'obsolete'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.planning_versions (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  case_id                uuid not null references public.cases(id) on delete cascade,
  version_number         int not null default 1,
  status                 public.planning_status not null default 'draft',
  technical_description  text,
  created_by             uuid references auth.users(id) on delete set null,
  submitted_at           timestamptz,
  approved_at            timestamptz,
  created_at             timestamptz not null default timezone('utc', now()),
  updated_at             timestamptz not null default timezone('utc', now()),
  unique (case_id, version_number)
);

drop trigger if exists trg_planning_versions_updated_at on public.planning_versions;
create trigger trg_planning_versions_updated_at
before update on public.planning_versions
for each row execute function public.set_updated_at();

create index if not exists planning_versions_case_idx on public.planning_versions (case_id, version_number desc);

alter table public.planning_versions enable row level security;
alter table public.planning_versions force row level security;

drop policy if exists "planning_v_select_internal" on public.planning_versions;
drop policy if exists "planning_v_select_dentist"  on public.planning_versions;
drop policy if exists "planning_v_write_internal"  on public.planning_versions;

create policy "planning_v_select_internal"
on public.planning_versions for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

create policy "planning_v_select_dentist"
on public.planning_versions for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and status <> 'draft'
  and exists (
    select 1 from public.cases c join public.dentists d on d.id = c.dentist_id
    where c.id = planning_versions.case_id and d.profile_id = auth.uid()
  )
);

create policy "planning_v_write_internal"
on public.planning_versions for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'technical_planning')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'technical_planning')
);

-- Approved versions are locked
create or replace function public.enforce_planning_immutability()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'UPDATE' and old.status = 'approved') then
    if (new.status <> 'approved' and new.status <> 'obsolete') then
      raise exception 'Approved planning versions can only transition to obsolete';
    end if;
    if (old.technical_description is distinct from new.technical_description) then
      raise exception 'Approved planning versions are immutable';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_planning_immutability on public.planning_versions;
create trigger trg_enforce_planning_immutability
before update on public.planning_versions
for each row execute function public.enforce_planning_immutability();

-- ─── planning_files (join to case_files) ────────────────────
create table if not exists public.planning_files (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  planning_version_id   uuid not null references public.planning_versions(id) on delete cascade,
  case_file_id          uuid not null references public.case_files(id) on delete cascade,
  created_at            timestamptz not null default timezone('utc', now()),
  unique (planning_version_id, case_file_id)
);

create index if not exists planning_files_v_idx on public.planning_files (planning_version_id);

alter table public.planning_files enable row level security;
alter table public.planning_files force row level security;

drop policy if exists "planning_files_select_via_v" on public.planning_files;
drop policy if exists "planning_files_write_internal" on public.planning_files;

create policy "planning_files_select_via_v"
on public.planning_files for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and (
    public.is_internal_user()
    or exists (
      select 1 from public.planning_versions pv where pv.id = planning_version_id and pv.status <> 'draft'
        and exists (select 1 from public.cases c join public.dentists d on d.id = c.dentist_id
                    where c.id = pv.case_id and d.profile_id = auth.uid())
    )
  )
);

create policy "planning_files_write_internal"
on public.planning_files for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'technical_planning')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'technical_planning')
);

-- ─── planning_actions (audit) ───────────────────────────────
create table if not exists public.planning_actions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  planning_version_id   uuid not null references public.planning_versions(id) on delete cascade,
  action                text not null,
  comment               text,
  performed_by          uuid references auth.users(id) on delete set null,
  ip_address            inet,
  user_agent            text,
  created_at            timestamptz not null default timezone('utc', now())
);

create index if not exists planning_actions_v_idx on public.planning_actions (planning_version_id, created_at desc);

alter table public.planning_actions enable row level security;
alter table public.planning_actions force row level security;

drop policy if exists "planning_actions_select_internal" on public.planning_actions;
drop policy if exists "planning_actions_insert_any"      on public.planning_actions;

create policy "planning_actions_select_internal"
on public.planning_actions for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

create policy "planning_actions_insert_any"
on public.planning_actions for insert to authenticated
with check (organization_id = public.current_user_organization_id());
