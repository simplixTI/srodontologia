-- =============================================================
-- 0006 · Row Level Security · organizations
-- =============================================================

alter table public.organizations enable row level security;
alter table public.organizations force row level security;

drop policy if exists "org_select_own"       on public.organizations;
drop policy if exists "org_update_own_admin" on public.organizations;
drop policy if exists "org_insert_super"     on public.organizations;
drop policy if exists "org_delete_super"     on public.organizations;

-- Any authenticated user in the org can read the org they belong to.
create policy "org_select_own"
on public.organizations for select
to authenticated
using (id = public.current_user_organization_id());

-- Only admins/super_admins of the org can update it.
create policy "org_update_own_admin"
on public.organizations for update
to authenticated
using (
  id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin')
)
with check (
  id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin')
);

-- Only super_admins can create new organizations (future SaaS onboarding).
create policy "org_insert_super"
on public.organizations for insert
to authenticated
with check (public.is_super_admin());

-- Only super_admins can hard-delete an organization.
create policy "org_delete_super"
on public.organizations for delete
to authenticated
using (public.is_super_admin());
