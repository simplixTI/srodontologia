-- =============================================================
-- 0016 · clinics
-- =============================================================

create table if not exists public.clinics (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null references public.organizations(id) on delete cascade,
  legal_name                text,
  trade_name                text not null,
  document                  text,                       -- CNPJ / CPF
  email                     citext,
  phone                     text,
  whatsapp                  text,
  address_line              text,
  address_number            text,
  address_complement        text,
  neighborhood              text,
  city                      text,
  state                     text,
  zip_code                  text,
  financial_contact_name    text,
  financial_contact_email   citext,
  financial_contact_phone   text,
  payment_terms             text,
  notes                     text,
  active                    boolean not null default true,
  created_by                uuid references auth.users(id) on delete set null,
  created_at                timestamptz not null default timezone('utc', now()),
  updated_at                timestamptz not null default timezone('utc', now()),
  archived_at               timestamptz
);

drop trigger if exists trg_clinics_updated_at on public.clinics;
create trigger trg_clinics_updated_at
before update on public.clinics
for each row execute function public.set_updated_at();

create index if not exists clinics_org_idx      on public.clinics (organization_id);
create index if not exists clinics_active_idx   on public.clinics (organization_id, active) where archived_at is null;
create index if not exists clinics_trade_idx    on public.clinics (organization_id, trade_name);

alter table public.clinics enable row level security;
alter table public.clinics force row level security;

drop policy if exists "clinics_select_internal"  on public.clinics;
drop policy if exists "clinics_write_admin_comm" on public.clinics;

create policy "clinics_select_internal"
on public.clinics for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

create policy "clinics_write_admin_comm"
on public.clinics for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'commercial')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'commercial')
);
