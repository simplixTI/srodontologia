-- =============================================================
-- 0029 · deliveries
-- =============================================================

create table if not exists public.deliveries (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null references public.organizations(id) on delete cascade,
  case_id                   uuid not null references public.cases(id) on delete cascade,
  status                    public.delivery_status not null default 'pending',
  method                    text,                     -- e.g. 'courier', 'sedex', 'pickup'
  carrier                   text,                     -- e.g. 'Correios', 'JadLog'
  tracking_code             text,
  tracking_url              text,
  recipient_name            text,
  estimated_delivery_at     timestamptz,
  shipped_at                timestamptz,
  delivered_at              timestamptz,
  confirmation_data         jsonb not null default '{}'::jsonb,  -- IP, user_agent, notes on confirm
  notes                     text,
  created_at                timestamptz not null default timezone('utc', now()),
  updated_at                timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_deliveries_updated_at on public.deliveries;
create trigger trg_deliveries_updated_at
before update on public.deliveries
for each row execute function public.set_updated_at();

create index if not exists deliveries_case_idx    on public.deliveries (case_id);
create index if not exists deliveries_status_idx  on public.deliveries (organization_id, status);
create index if not exists deliveries_tracking_idx on public.deliveries (tracking_code) where tracking_code is not null;

alter table public.deliveries enable row level security;
alter table public.deliveries force row level security;

drop policy if exists "deliveries_select_internal" on public.deliveries;
drop policy if exists "deliveries_select_dentist"  on public.deliveries;
drop policy if exists "deliveries_write_internal"  on public.deliveries;
drop policy if exists "deliveries_update_dentist"  on public.deliveries;

create policy "deliveries_select_internal"
on public.deliveries for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

create policy "deliveries_select_dentist"
on public.deliveries for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and exists (
    select 1 from public.cases c join public.dentists d on d.id = c.dentist_id
    where c.id = deliveries.case_id and d.profile_id = auth.uid()
  )
);

create policy "deliveries_write_internal"
on public.deliveries for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'logistics', 'production')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'logistics', 'production')
);

-- Dentists can update delivery to confirm receipt (only their own cases)
create policy "deliveries_update_dentist"
on public.deliveries for update to authenticated
using (
  organization_id = public.current_user_organization_id()
  and status in ('dispatched', 'in_transit')
  and exists (
    select 1 from public.cases c join public.dentists d on d.id = c.dentist_id
    where c.id = deliveries.case_id and d.profile_id = auth.uid()
  )
);
