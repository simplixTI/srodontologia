-- =============================================================
-- 0005 · RLS helper functions
-- SECURITY DEFINER + STABLE + search_path = public
-- These read the *caller's* auth.uid() but bypass RLS on profiles,
-- avoiding the classic "policy references profiles which triggers
-- policy which references profiles" recursion trap.
-- =============================================================

create or replace function public.current_user_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'
      and p.status = 'active'
  );
$$;

create or replace function public.is_internal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role <> 'dentist'
      and p.status = 'active'
  );
$$;

-- Locks
revoke all on function public.current_user_organization_id() from public;
revoke all on function public.current_user_role()            from public;
revoke all on function public.is_super_admin()               from public;
revoke all on function public.is_internal_user()             from public;

grant execute on function public.current_user_organization_id() to authenticated, service_role;
grant execute on function public.current_user_role()            to authenticated, service_role;
grant execute on function public.is_super_admin()               to authenticated, service_role;
grant execute on function public.is_internal_user()             to authenticated, service_role;
