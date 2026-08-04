-- =============================================================
-- 0020 · cases (core) + case_number sequence + case_status_history
-- =============================================================

-- Sequence for case numbers (concurrency-safe)
create sequence if not exists public.case_number_seq start 1;

create or replace function public.next_case_number()
returns text
language plpgsql
as $$
declare
  n bigint;
begin
  n := nextval('public.case_number_seq');
  return 'SR-' || lpad(n::text, 6, '0');
end;
$$;

create table if not exists public.cases (
  id                          uuid primary key default gen_random_uuid(),
  organization_id             uuid not null references public.organizations(id) on delete cascade,
  case_number                 text unique not null default public.next_case_number(),
  dentist_id                  uuid not null references public.dentists(id) on delete restrict,
  clinic_id                   uuid references public.clinics(id) on delete set null,
  patient_id                  uuid references public.patients(id) on delete set null,
  case_type_id                uuid references public.case_types(id) on delete restrict,
  title                       text not null,
  priority                    public.case_priority not null default 'normal',
  internal_status             public.case_status not null default 'draft',
  public_status               public.public_case_status generated always as (public.map_case_status_to_public(internal_status)) stored,
  clinical_description        text,
  dentist_notes               text,
  internal_notes              text,
  teeth_regions               text[],
  material                    text,
  shade                       text,
  requested_delivery_date     date,
  estimated_delivery_date     date,
  actual_delivery_date        date,
  commercial_owner_id         uuid references public.profiles(id) on delete set null,
  technical_owner_id          uuid references public.profiles(id) on delete set null,
  production_owner_id         uuid references public.profiles(id) on delete set null,
  created_by                  uuid references auth.users(id) on delete set null,
  submitted_at                timestamptz,
  completed_at                timestamptz,
  cancelled_at                timestamptz,
  cancellation_reason         text,
  duplicated_from_case_id     uuid references public.cases(id) on delete set null,
  health_score                int not null default 0,       -- 0-100
  missing_required_items_count int not null default 0,
  created_at                  timestamptz not null default timezone('utc', now()),
  updated_at                  timestamptz not null default timezone('utc', now()),
  archived_at                 timestamptz
);

drop trigger if exists trg_cases_updated_at on public.cases;
create trigger trg_cases_updated_at
before update on public.cases
for each row execute function public.set_updated_at();

create index if not exists cases_org_idx           on public.cases (organization_id);
create index if not exists cases_dentist_idx       on public.cases (organization_id, dentist_id) where archived_at is null;
create index if not exists cases_clinic_idx        on public.cases (organization_id, clinic_id) where archived_at is null;
create index if not exists cases_status_idx        on public.cases (organization_id, internal_status);
create index if not exists cases_technical_owner_idx on public.cases (organization_id, technical_owner_id);
create index if not exists cases_number_idx        on public.cases (case_number);

alter table public.cases enable row level security;
alter table public.cases force row level security;

drop policy if exists "cases_select_internal" on public.cases;
drop policy if exists "cases_select_dentist"  on public.cases;
drop policy if exists "cases_write_internal"  on public.cases;
drop policy if exists "cases_insert_dentist"  on public.cases;
drop policy if exists "cases_update_dentist"  on public.cases;

create policy "cases_select_internal"
on public.cases for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

-- Dentists see only their own cases
create policy "cases_select_dentist"
on public.cases for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and exists (
    select 1 from public.dentists d
    where d.id = cases.dentist_id
      and d.profile_id = auth.uid()
  )
);

create policy "cases_write_internal"
on public.cases for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'commercial', 'technical_planning', 'production')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'commercial', 'technical_planning', 'production')
);

-- Dentists can insert a case for themselves (only in draft/submitted status)
create policy "cases_insert_dentist"
on public.cases for insert to authenticated
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() = 'dentist'
  and exists (
    select 1 from public.dentists d
    where d.id = cases.dentist_id
      and d.profile_id = auth.uid()
  )
  and internal_status in ('draft', 'submitted')
);

-- Dentists can update only their own DRAFT cases (never touch approved/produced)
create policy "cases_update_dentist"
on public.cases for update to authenticated
using (
  organization_id = public.current_user_organization_id()
  and internal_status = 'draft'
  and exists (
    select 1 from public.dentists d
    where d.id = cases.dentist_id
      and d.profile_id = auth.uid()
  )
)
with check (
  organization_id = public.current_user_organization_id()
  and internal_status in ('draft', 'submitted')
);

-- ─── case_status_history ─────────────────────────────────────
create table if not exists public.case_status_history (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null references public.organizations(id) on delete cascade,
  case_id                   uuid not null references public.cases(id) on delete cascade,
  previous_internal_status  public.case_status,
  new_internal_status       public.case_status not null,
  previous_public_status    public.public_case_status,
  new_public_status         public.public_case_status,
  changed_by                uuid references auth.users(id) on delete set null,
  public_note               text,
  internal_note             text,
  created_at                timestamptz not null default timezone('utc', now())
);

create index if not exists case_status_history_case_idx
  on public.case_status_history (case_id, created_at desc);

alter table public.case_status_history enable row level security;
alter table public.case_status_history force row level security;

drop policy if exists "csh_select_internal" on public.case_status_history;
drop policy if exists "csh_select_dentist"  on public.case_status_history;
drop policy if exists "csh_insert_internal" on public.case_status_history;

create policy "csh_select_internal"
on public.case_status_history for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

-- Dentists see the history but WITHOUT internal_note (query must exclude it)
create policy "csh_select_dentist"
on public.case_status_history for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and exists (
    select 1
    from public.cases c
    join public.dentists d on d.id = c.dentist_id
    where c.id = case_status_history.case_id
      and d.profile_id = auth.uid()
  )
);

create policy "csh_insert_internal"
on public.case_status_history for insert to authenticated
with check (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

-- Trigger: log status changes automatically
create or replace function public.log_case_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'UPDATE' and old.internal_status is distinct from new.internal_status) then
    insert into public.case_status_history (
      organization_id, case_id,
      previous_internal_status, new_internal_status,
      previous_public_status,   new_public_status,
      changed_by
    )
    values (
      new.organization_id, new.id,
      old.internal_status, new.internal_status,
      old.public_status,   new.public_status,
      auth.uid()
    );
  elsif (tg_op = 'INSERT') then
    insert into public.case_status_history (
      organization_id, case_id,
      previous_internal_status, new_internal_status,
      previous_public_status,   new_public_status,
      changed_by
    )
    values (
      new.organization_id, new.id,
      null, new.internal_status,
      null, new.public_status,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_case_status_change on public.cases;
create trigger trg_log_case_status_change
after insert or update of internal_status on public.cases
for each row execute function public.log_case_status_change();
