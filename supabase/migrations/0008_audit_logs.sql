-- =============================================================
-- 0008 · audit_logs (append-only)
-- =============================================================

create table if not exists public.audit_logs (
  id              bigserial primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  user_id         uuid references auth.users(id) on delete set null,
  action          text not null,
  entity_type     text,
  entity_id       text,
  previous_data   jsonb,
  new_data        jsonb,
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_organization_idx on public.audit_logs (organization_id);
create index if not exists audit_logs_user_idx          on public.audit_logs (user_id);
create index if not exists audit_logs_entity_idx        on public.audit_logs (entity_type, entity_id);
create index if not exists audit_logs_created_idx       on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;

drop policy if exists "audit_select_admin" on public.audit_logs;
drop policy if exists "audit_insert_any"   on public.audit_logs;

-- Only super_admin/admin can read audit logs of their org.
create policy "audit_select_admin"
on public.audit_logs for select
to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin')
);

-- Any authenticated user can insert audit rows scoped to their org.
-- Update/delete are forbidden: audit is append-only for everyone below
-- the service role.
create policy "audit_insert_any"
on public.audit_logs for insert
to authenticated
with check (
  organization_id is null
  or organization_id = public.current_user_organization_id()
);
