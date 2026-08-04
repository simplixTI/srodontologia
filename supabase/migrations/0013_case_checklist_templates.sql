-- =============================================================
-- 0013 · case_checklist_templates
-- Defines the items that make up a case type's checklist.
-- Each item has a title, whether it's required, the accepted file
-- types, and a category used for auto-classification of uploads.
-- =============================================================

do $$ begin
  create type public.checklist_item_category as enum (
    'stl',
    'obj',
    'dicom_tomography',
    'intraoral_photo',
    'extraoral_photo',
    'xray',
    'planning',
    'material_spec',
    'shade',
    'notes',
    'bite_registration',
    'other'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.case_checklist_templates (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  case_type_id         uuid not null references public.case_types(id) on delete cascade,
  code                 text,                                  -- optional slug, e.g. 'STL_SUPERIOR'
  title                text not null,
  description          text,
  category             public.checklist_item_category not null default 'other',
  required             boolean not null default true,
  sort_order           integer not null default 0,
  accepted_file_types  text[] not null default '{}',          -- e.g. ['stl','obj']
  minimum_files        integer not null default 1,
  maximum_files        integer not null default 1,
  created_at           timestamptz not null default timezone('utc', now()),
  updated_at           timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_checklist_templates_updated_at on public.case_checklist_templates;
create trigger trg_checklist_templates_updated_at
before update on public.case_checklist_templates
for each row execute function public.set_updated_at();

create index if not exists checklist_templates_org_type_idx
  on public.case_checklist_templates (organization_id, case_type_id, sort_order);

alter table public.case_checklist_templates enable row level security;
alter table public.case_checklist_templates force row level security;

drop policy if exists "checklist_templates_select_org"     on public.case_checklist_templates;
drop policy if exists "checklist_templates_select_dentist" on public.case_checklist_templates;
drop policy if exists "checklist_templates_write_admin"    on public.case_checklist_templates;

create policy "checklist_templates_select_org"
on public.case_checklist_templates for select
to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

-- Dentists can read templates for active case types of their org
create policy "checklist_templates_select_dentist"
on public.case_checklist_templates for select
to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() = 'dentist'
  and exists (
    select 1 from public.case_types ct
    where ct.id = case_type_id
      and ct.organization_id = organization_id
      and ct.active = true
  )
);

create policy "checklist_templates_write_admin"
on public.case_checklist_templates for all
to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin')
);
