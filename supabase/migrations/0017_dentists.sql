-- =============================================================
-- 0017 · dentists + clinic_dentists (M:N)
-- =============================================================

create table if not exists public.dentists (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  profile_id            uuid unique references public.profiles(id) on delete set null,
  primary_clinic_id     uuid references public.clinics(id) on delete set null,
  full_name             text not null,
  cpf                   text,
  cro_number            text,
  cro_state             text,
  specialty             text,
  email                 citext,
  phone                 text,
  whatsapp              text,
  instagram             text,
  city                  text,
  state                 text,
  source                text,
  commercial_owner_id   uuid references public.profiles(id) on delete set null,
  customer_status       public.customer_status not null default 'lead',
  credit_limit          numeric(12,2),
  payment_terms         text,
  notes                 text,
  active                boolean not null default true,
  last_case_at          timestamptz,
  created_by            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  archived_at           timestamptz
);

drop trigger if exists trg_dentists_updated_at on public.dentists;
create trigger trg_dentists_updated_at
before update on public.dentists
for each row execute function public.set_updated_at();

create index if not exists dentists_org_idx        on public.dentists (organization_id);
create index if not exists dentists_owner_idx      on public.dentists (organization_id, commercial_owner_id);
create index if not exists dentists_status_idx     on public.dentists (organization_id, customer_status);
create index if not exists dentists_cro_idx        on public.dentists (organization_id, cro_state, cro_number);
create index if not exists dentists_profile_idx    on public.dentists (profile_id) where profile_id is not null;

alter table public.dentists enable row level security;
alter table public.dentists force row level security;

drop policy if exists "dentists_select_internal"  on public.dentists;
drop policy if exists "dentists_select_self"      on public.dentists;
drop policy if exists "dentists_write_admin_comm" on public.dentists;

create policy "dentists_select_internal"
on public.dentists for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

-- Dentist reads its own dentist row via profile_id
create policy "dentists_select_self"
on public.dentists for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and profile_id = auth.uid()
);

create policy "dentists_write_admin_comm"
on public.dentists for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'commercial')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'commercial')
);

-- ─── clinic_dentists (M:N join) ──────────────────────────────
create table if not exists public.clinic_dentists (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  clinic_id         uuid not null references public.clinics(id) on delete cascade,
  dentist_id        uuid not null references public.dentists(id) on delete cascade,
  role_at_clinic    text,
  is_primary        boolean not null default false,
  active            boolean not null default true,
  created_at        timestamptz not null default timezone('utc', now()),
  unique (clinic_id, dentist_id)
);

create index if not exists clinic_dentists_clinic_idx  on public.clinic_dentists (clinic_id);
create index if not exists clinic_dentists_dentist_idx on public.clinic_dentists (dentist_id);

alter table public.clinic_dentists enable row level security;
alter table public.clinic_dentists force row level security;

drop policy if exists "clinic_dentists_select_internal"  on public.clinic_dentists;
drop policy if exists "clinic_dentists_select_self"      on public.clinic_dentists;
drop policy if exists "clinic_dentists_write_admin_comm" on public.clinic_dentists;

create policy "clinic_dentists_select_internal"
on public.clinic_dentists for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

create policy "clinic_dentists_select_self"
on public.clinic_dentists for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and exists (
    select 1 from public.dentists d
    where d.id = dentist_id and d.profile_id = auth.uid()
  )
);

create policy "clinic_dentists_write_admin_comm"
on public.clinic_dentists for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'commercial')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'commercial')
);
