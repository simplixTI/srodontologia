-- =============================================================
-- 0019 · patients (LGPD-minimized: no full name required)
-- =============================================================

create table if not exists public.patients (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  dentist_id        uuid not null references public.dentists(id) on delete restrict,
  clinic_id         uuid references public.clinics(id) on delete set null,
  patient_code      text,                    -- internal code chosen by the dentist
  initials          text,                    -- e.g. "MSC"
  birth_year        int,
  notes             text,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now()),
  archived_at       timestamptz
);

drop trigger if exists trg_patients_updated_at on public.patients;
create trigger trg_patients_updated_at
before update on public.patients
for each row execute function public.set_updated_at();

create index if not exists patients_dentist_idx  on public.patients (dentist_id) where archived_at is null;
create index if not exists patients_code_idx     on public.patients (organization_id, dentist_id, patient_code);

alter table public.patients enable row level security;
alter table public.patients force row level security;

drop policy if exists "patients_select_internal" on public.patients;
drop policy if exists "patients_select_dentist"  on public.patients;
drop policy if exists "patients_write_internal"  on public.patients;

create policy "patients_select_internal"
on public.patients for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

-- Dentist can see only patients tied to their own dentist row
create policy "patients_select_dentist"
on public.patients for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and exists (
    select 1 from public.dentists d
    where d.id = patients.dentist_id
      and d.profile_id = auth.uid()
  )
);

create policy "patients_write_internal"
on public.patients for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'commercial', 'technical_planning')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'commercial', 'technical_planning')
);
