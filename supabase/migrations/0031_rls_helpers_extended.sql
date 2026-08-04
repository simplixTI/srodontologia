-- =============================================================
-- 0031 · Extended RLS helper functions
-- =============================================================

create or replace function public.user_can_access_case(p_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cases c
    where c.id = p_case_id
      and c.organization_id = public.current_user_organization_id()
      and (
        public.is_internal_user()
        or exists (
          select 1 from public.dentists d
          where d.id = c.dentist_id
            and d.profile_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.user_can_manage_case(p_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cases c
    where c.id = p_case_id
      and c.organization_id = public.current_user_organization_id()
      and public.current_user_role() in
        ('super_admin', 'admin', 'commercial', 'technical_planning', 'production')
  );
$$;

create or replace function public.user_can_access_clinic(p_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clinics c
    where c.id = p_clinic_id
      and c.organization_id = public.current_user_organization_id()
      and (
        public.is_internal_user()
        or exists (
          select 1
          from public.dentists d
          join public.clinic_dentists cd on cd.dentist_id = d.id
          where cd.clinic_id = c.id
            and d.profile_id = auth.uid()
        )
      )
  );
$$;

revoke all on function public.user_can_access_case(uuid)   from public;
revoke all on function public.user_can_manage_case(uuid)   from public;
revoke all on function public.user_can_access_clinic(uuid) from public;

grant execute on function public.user_can_access_case(uuid)   to authenticated, service_role;
grant execute on function public.user_can_manage_case(uuid)   to authenticated, service_role;
grant execute on function public.user_can_access_clinic(uuid) to authenticated, service_role;
