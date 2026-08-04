-- =============================================================
-- 0026 · quotes + quote_items + quote_actions
-- =============================================================

create sequence if not exists public.quote_number_seq start 1;

create or replace function public.next_quote_number()
returns text language plpgsql as $$
declare n bigint;
begin
  n := nextval('public.quote_number_seq');
  return 'ORC-' || lpad(n::text, 6, '0');
end;
$$;

do $$ begin
  create type public.quote_status as enum (
    'draft', 'sent', 'approved', 'rejected', 'expired', 'changes_requested'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.quotes (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  case_id           uuid not null references public.cases(id) on delete cascade,
  quote_number      text unique not null default public.next_quote_number(),
  version_number    int not null default 1,
  status            public.quote_status not null default 'draft',
  subtotal          numeric(12,2) not null default 0,
  discount          numeric(12,2) not null default 0,
  shipping_cost     numeric(12,2) not null default 0,
  total             numeric(12,2) not null default 0,
  payment_terms     text,
  validity_date     date,
  estimated_days    int,
  public_notes      text,
  internal_notes    text,
  created_by        uuid references auth.users(id) on delete set null,
  sent_at           timestamptz,
  approved_at       timestamptz,
  rejected_at       timestamptz,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_quotes_updated_at on public.quotes;
create trigger trg_quotes_updated_at
before update on public.quotes
for each row execute function public.set_updated_at();

create index if not exists quotes_case_idx   on public.quotes (case_id, version_number desc);
create index if not exists quotes_status_idx on public.quotes (organization_id, status);

alter table public.quotes enable row level security;
alter table public.quotes force row level security;

drop policy if exists "quotes_select_internal" on public.quotes;
drop policy if exists "quotes_select_dentist"  on public.quotes;
drop policy if exists "quotes_write_internal"  on public.quotes;

create policy "quotes_select_internal"
on public.quotes for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

-- Dentist sees quotes of their own cases, only if status not 'draft'
create policy "quotes_select_dentist"
on public.quotes for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and status <> 'draft'
  and exists (
    select 1 from public.cases c join public.dentists d on d.id = c.dentist_id
    where c.id = quotes.case_id and d.profile_id = auth.uid()
  )
);

create policy "quotes_write_internal"
on public.quotes for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'commercial', 'finance')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'commercial', 'finance')
);

-- Approved quotes are immutable: block UPDATE/DELETE via trigger
create or replace function public.enforce_quote_immutability()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'UPDATE' and old.status = 'approved' and old.status = new.status) then
    if (old.total is distinct from new.total or old.subtotal is distinct from new.subtotal) then
      raise exception 'Approved quotes are immutable';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_quote_immutability on public.quotes;
create trigger trg_enforce_quote_immutability
before update on public.quotes
for each row execute function public.enforce_quote_immutability();

-- ─── quote_items ────────────────────────────────────────────
create table if not exists public.quote_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id        uuid not null references public.quotes(id) on delete cascade,
  description     text not null,
  quantity        numeric(12,2) not null default 1,
  unit_price      numeric(12,2) not null default 0,
  discount        numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  sort_order      int not null default 0
);

create index if not exists quote_items_quote_idx on public.quote_items (quote_id, sort_order);

alter table public.quote_items enable row level security;
alter table public.quote_items force row level security;

drop policy if exists "quote_items_select_via_quote" on public.quote_items;
drop policy if exists "quote_items_write_internal"    on public.quote_items;

create policy "quote_items_select_via_quote"
on public.quote_items for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and (
    public.is_internal_user()
    or exists (
      select 1 from public.quotes q where q.id = quote_id and q.status <> 'draft'
        and exists (select 1 from public.cases c join public.dentists d on d.id = c.dentist_id
                    where c.id = q.case_id and d.profile_id = auth.uid())
    )
  )
);

create policy "quote_items_write_internal"
on public.quote_items for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'commercial', 'finance')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'commercial', 'finance')
);

-- ─── quote_actions (audit trail: sent/viewed/approved/rejected/change_requested/expired) ──
create table if not exists public.quote_actions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id        uuid not null references public.quotes(id) on delete cascade,
  action          text not null,
  comment         text,
  performed_by    uuid references auth.users(id) on delete set null,
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz not null default timezone('utc', now())
);

create index if not exists quote_actions_quote_idx on public.quote_actions (quote_id, created_at desc);

alter table public.quote_actions enable row level security;
alter table public.quote_actions force row level security;

drop policy if exists "quote_actions_select_via_quote" on public.quote_actions;
drop policy if exists "quote_actions_insert_any"       on public.quote_actions;

create policy "quote_actions_select_via_quote"
on public.quote_actions for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and (
    public.is_internal_user()
    or exists (
      select 1 from public.quotes q where q.id = quote_id
        and exists (select 1 from public.cases c join public.dentists d on d.id = c.dentist_id
                    where c.id = q.case_id and d.profile_id = auth.uid())
    )
  )
);

-- Any authenticated org member can log actions (immutable audit trail)
create policy "quote_actions_insert_any"
on public.quote_actions for insert to authenticated
with check (organization_id = public.current_user_organization_id());
