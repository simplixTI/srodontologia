-- =============================================================
-- 0028 · invoices + payments (basic, no gateway integration)
-- =============================================================

create sequence if not exists public.invoice_number_seq start 1;

create or replace function public.next_invoice_number()
returns text language plpgsql as $$
declare n bigint;
begin
  n := nextval('public.invoice_number_seq');
  return 'FT-' || lpad(n::text, 6, '0');
end;
$$;

do $$ begin
  create type public.invoice_status as enum ('open', 'paid', 'overdue', 'partial', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('pix', 'boleto', 'credit_card', 'debit_card', 'bank_transfer', 'cash', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'confirmed', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

create table if not exists public.invoices (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  case_id           uuid references public.cases(id) on delete set null,
  dentist_id        uuid references public.dentists(id) on delete restrict,
  quote_id          uuid references public.quotes(id) on delete set null,
  invoice_number    text unique not null default public.next_invoice_number(),
  total             numeric(12,2) not null default 0,
  status            public.invoice_status not null default 'open',
  due_date          date,
  paid_at           timestamptz,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create index if not exists invoices_dentist_idx on public.invoices (organization_id, dentist_id);
create index if not exists invoices_status_idx  on public.invoices (organization_id, status);
create index if not exists invoices_due_idx     on public.invoices (organization_id, due_date);

alter table public.invoices enable row level security;
alter table public.invoices force row level security;

drop policy if exists "invoices_select_internal" on public.invoices;
drop policy if exists "invoices_select_dentist"  on public.invoices;
drop policy if exists "invoices_write_finance"   on public.invoices;

create policy "invoices_select_internal"
on public.invoices for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

create policy "invoices_select_dentist"
on public.invoices for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and exists (
    select 1 from public.dentists d
    where d.id = invoices.dentist_id
      and d.profile_id = auth.uid()
  )
);

create policy "invoices_write_finance"
on public.invoices for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'finance')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'finance')
);

-- ─── payments ────────────────────────────────────────────────
create table if not exists public.payments (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  invoice_id            uuid not null references public.invoices(id) on delete cascade,
  method                public.payment_method not null default 'pix',
  amount                numeric(12,2) not null,
  installment_number    int not null default 1,
  status                public.payment_status not null default 'pending',
  external_reference    text,
  paid_at               timestamptz,
  created_at            timestamptz not null default timezone('utc', now())
);

create index if not exists payments_invoice_idx on public.payments (invoice_id);

alter table public.payments enable row level security;
alter table public.payments force row level security;

drop policy if exists "payments_select_via_invoice" on public.payments;
drop policy if exists "payments_write_finance"       on public.payments;

create policy "payments_select_via_invoice"
on public.payments for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and (
    public.is_internal_user()
    or exists (
      select 1 from public.invoices i
      join public.dentists d on d.id = i.dentist_id
      where i.id = payments.invoice_id and d.profile_id = auth.uid()
    )
  )
);

create policy "payments_write_finance"
on public.payments for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'finance')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'finance')
);
