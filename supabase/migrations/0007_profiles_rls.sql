-- =============================================================
-- 0007 · Row Level Security · profiles
-- =============================================================

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

drop policy if exists "profile_select_self"           on public.profiles;
drop policy if exists "profile_select_org_internal"   on public.profiles;
drop policy if exists "profile_update_self"           on public.profiles;
drop policy if exists "profile_update_admin"          on public.profiles;
drop policy if exists "profile_insert_admin"          on public.profiles;
drop policy if exists "profile_delete_super"          on public.profiles;

-- Anyone can read their own profile.
create policy "profile_select_self"
on public.profiles for select
to authenticated
using (id = auth.uid());

-- Internal staff can read profiles in the same organization.
create policy "profile_select_org_internal"
on public.profiles for select
to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

-- Users can update *safe* fields of their own profile (name, phone, avatar).
-- Role changes are handled by a separate admin policy below.
create policy "profile_update_self"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and organization_id = public.current_user_organization_id()
  and role = public.current_user_role()   -- can't self-elevate
);

-- Admins (and super_admins) can update any profile in their org.
create policy "profile_update_admin"
on public.profiles for update
to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin')
);

-- Only admins can insert. In practice, profile rows are created by the
-- server (service role) right after auth.users insertion, so this policy
-- is mostly a defence-in-depth check.
create policy "profile_insert_admin"
on public.profiles for insert
to authenticated
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin')
);

-- Only super_admins can hard-delete a profile (prefer status = 'archived').
create policy "profile_delete_super"
on public.profiles for delete
to authenticated
using (public.is_super_admin());
