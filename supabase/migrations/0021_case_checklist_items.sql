-- =============================================================
-- 0021 · case_checklist_items (instantiated per case)
-- Snapshots the template — case is independent of future template edits
-- =============================================================

do $$ begin
  create type public.checklist_item_status as enum (
    'pending', 'in_progress', 'completed', 'waived'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.case_checklist_items (
  id                           uuid primary key default gen_random_uuid(),
  organization_id              uuid not null references public.organizations(id) on delete cascade,
  case_id                      uuid not null references public.cases(id) on delete cascade,
  checklist_template_item_id   uuid references public.case_checklist_templates(id) on delete set null,
  -- Snapshots from template
  title_snapshot               text not null,
  description_snapshot         text,
  required_snapshot            boolean not null default true,
  category_snapshot            public.checklist_item_category not null default 'other',
  accepted_file_types_snapshot text[] not null default '{}',
  minimum_files_snapshot       int not null default 1,
  maximum_files_snapshot       int not null default 1,
  sort_order_snapshot          int not null default 0,
  -- Runtime state
  status                       public.checklist_item_status not null default 'pending',
  completed                    boolean not null default false,
  completed_at                 timestamptz,
  completed_by                 uuid references auth.users(id) on delete set null,
  waived_reason                text,
  notes                        text,
  created_at                   timestamptz not null default timezone('utc', now()),
  updated_at                   timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_case_checklist_items_updated_at on public.case_checklist_items;
create trigger trg_case_checklist_items_updated_at
before update on public.case_checklist_items
for each row execute function public.set_updated_at();

create index if not exists case_checklist_items_case_idx
  on public.case_checklist_items (case_id, sort_order_snapshot);

alter table public.case_checklist_items enable row level security;
alter table public.case_checklist_items force row level security;

drop policy if exists "cci_select_internal" on public.case_checklist_items;
drop policy if exists "cci_select_dentist"  on public.case_checklist_items;
drop policy if exists "cci_write_internal"  on public.case_checklist_items;
drop policy if exists "cci_write_dentist"   on public.case_checklist_items;

create policy "cci_select_internal"
on public.case_checklist_items for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

create policy "cci_select_dentist"
on public.case_checklist_items for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and exists (
    select 1
    from public.cases c
    join public.dentists d on d.id = c.dentist_id
    where c.id = case_checklist_items.case_id
      and d.profile_id = auth.uid()
  )
);

create policy "cci_write_internal"
on public.case_checklist_items for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'technical_planning', 'production')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'technical_planning', 'production')
);

-- Dentists can update checklist items on their own DRAFT cases (mark completed, add notes)
create policy "cci_write_dentist"
on public.case_checklist_items for update to authenticated
using (
  organization_id = public.current_user_organization_id()
  and exists (
    select 1
    from public.cases c
    join public.dentists d on d.id = c.dentist_id
    where c.id = case_checklist_items.case_id
      and d.profile_id = auth.uid()
      and c.internal_status = 'draft'
  )
);

-- ─── Instantiation helper ────────────────────────────────────
-- Copies the active template items for a case's case_type_id
-- into case_checklist_items. Idempotent — does nothing if items exist.
create or replace function public.instantiate_case_checklist(p_case_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case      record;
  v_inserted  int := 0;
begin
  select id, organization_id, case_type_id
    into v_case
  from public.cases
  where id = p_case_id;

  if v_case.id is null then
    return 0;
  end if;
  if v_case.case_type_id is null then
    return 0;
  end if;

  -- Skip if already instantiated
  if exists (select 1 from public.case_checklist_items where case_id = p_case_id) then
    return 0;
  end if;

  insert into public.case_checklist_items (
    organization_id, case_id, checklist_template_item_id,
    title_snapshot, description_snapshot, required_snapshot, category_snapshot,
    accepted_file_types_snapshot, minimum_files_snapshot, maximum_files_snapshot,
    sort_order_snapshot
  )
  select
    v_case.organization_id, p_case_id, t.id,
    t.title, t.description, t.required, t.category,
    t.accepted_file_types, t.minimum_files, t.maximum_files,
    t.sort_order
  from public.case_checklist_templates t
  where t.case_type_id = v_case.case_type_id
    and t.organization_id = v_case.organization_id;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

grant execute on function public.instantiate_case_checklist(uuid) to authenticated, service_role;
