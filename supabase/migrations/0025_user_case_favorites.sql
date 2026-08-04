-- =============================================================
-- 0025 · user_case_favorites (per-user favorite cases)
-- =============================================================

create table if not exists public.user_case_favorites (
  user_id         uuid not null references auth.users(id) on delete cascade,
  case_id         uuid not null references public.cases(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at      timestamptz not null default timezone('utc', now()),
  primary key (user_id, case_id)
);

create index if not exists user_case_favorites_case_idx on public.user_case_favorites (case_id);
create index if not exists user_case_favorites_user_idx on public.user_case_favorites (user_id);

alter table public.user_case_favorites enable row level security;
alter table public.user_case_favorites force row level security;

drop policy if exists "favorites_select_own" on public.user_case_favorites;
drop policy if exists "favorites_write_own"  on public.user_case_favorites;

create policy "favorites_select_own"
on public.user_case_favorites for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and user_id = auth.uid()
);

create policy "favorites_write_own"
on public.user_case_favorites for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and user_id = auth.uid()
)
with check (
  organization_id = public.current_user_organization_id()
  and user_id = auth.uid()
);
