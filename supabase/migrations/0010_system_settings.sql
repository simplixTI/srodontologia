-- =============================================================
-- 0010 · system_settings (key/value per organization)
-- =============================================================

create table if not exists public.system_settings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key             text not null,
  value           jsonb not null default '{}'::jsonb,
  updated_by      uuid references auth.users(id) on delete set null,
  updated_at      timestamptz not null default timezone('utc', now()),
  unique (organization_id, key)
);

drop trigger if exists trg_system_settings_updated_at on public.system_settings;
create trigger trg_system_settings_updated_at
before update on public.system_settings
for each row execute function public.set_updated_at();

alter table public.system_settings enable row level security;
alter table public.system_settings force row level security;

drop policy if exists "settings_select_internal" on public.system_settings;
drop policy if exists "settings_write_admin"     on public.system_settings;

create policy "settings_select_internal"
on public.system_settings for select
to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

create policy "settings_write_admin"
on public.system_settings for all
to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin')
);
