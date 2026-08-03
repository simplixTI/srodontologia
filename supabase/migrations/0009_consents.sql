-- =============================================================
-- 0009 · consents (LGPD)
-- =============================================================

create table if not exists public.consents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  user_id         uuid not null references auth.users(id) on delete cascade,
  consent_type    text not null,
  version         text not null,
  accepted        boolean not null,
  ip_address      inet,
  user_agent      text,
  accepted_at     timestamptz not null default timezone('utc', now())
);

create index if not exists consents_user_idx  on public.consents (user_id);
create index if not exists consents_type_idx  on public.consents (consent_type);

alter table public.consents enable row level security;
alter table public.consents force row level security;

drop policy if exists "consent_select_self"    on public.consents;
drop policy if exists "consent_select_admin"   on public.consents;
drop policy if exists "consent_insert_self"    on public.consents;

create policy "consent_select_self"
on public.consents for select
to authenticated
using (user_id = auth.uid());

create policy "consent_select_admin"
on public.consents for select
to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin')
);

create policy "consent_insert_self"
on public.consents for insert
to authenticated
with check (user_id = auth.uid());
