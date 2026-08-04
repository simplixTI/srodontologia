-- =============================================================
-- 0022 · case_files (metadata; blobs live in Storage)
-- =============================================================

create table if not exists public.case_files (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  case_id                uuid not null references public.cases(id) on delete cascade,
  checklist_item_id      uuid references public.case_checklist_items(id) on delete set null,
  uploaded_by            uuid references auth.users(id) on delete set null,
  file_name              text not null,
  original_name          text not null,
  storage_bucket         text not null default 'case-files',
  storage_path           text not null,
  mime_type              text,
  extension              text,
  file_size              bigint not null default 0,
  category               public.checklist_item_category not null default 'other',
  visibility             public.file_visibility not null default 'shared',
  version_number         int not null default 1,
  checksum               text,
  metadata               jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default timezone('utc', now()),
  archived_at            timestamptz
);

create index if not exists case_files_case_idx     on public.case_files (case_id) where archived_at is null;
create index if not exists case_files_checklist_idx on public.case_files (checklist_item_id);
create index if not exists case_files_category_idx on public.case_files (case_id, category);

alter table public.case_files enable row level security;
alter table public.case_files force row level security;

drop policy if exists "case_files_select_internal"      on public.case_files;
drop policy if exists "case_files_select_dentist"       on public.case_files;
drop policy if exists "case_files_insert_internal"      on public.case_files;
drop policy if exists "case_files_insert_dentist"       on public.case_files;
drop policy if exists "case_files_update_internal"      on public.case_files;
drop policy if exists "case_files_delete_internal"      on public.case_files;

create policy "case_files_select_internal"
on public.case_files for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

-- Dentists only see files of their cases AND visibility != 'internal'
create policy "case_files_select_dentist"
on public.case_files for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and visibility in ('dentist', 'shared')
  and exists (
    select 1
    from public.cases c
    join public.dentists d on d.id = c.dentist_id
    where c.id = case_files.case_id
      and d.profile_id = auth.uid()
  )
);

create policy "case_files_insert_internal"
on public.case_files for insert to authenticated
with check (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

-- Dentists can upload to their own DRAFT cases only
create policy "case_files_insert_dentist"
on public.case_files for insert to authenticated
with check (
  organization_id = public.current_user_organization_id()
  and visibility <> 'internal'
  and exists (
    select 1
    from public.cases c
    join public.dentists d on d.id = c.dentist_id
    where c.id = case_files.case_id
      and d.profile_id = auth.uid()
      and c.internal_status = 'draft'
  )
);

create policy "case_files_update_internal"
on public.case_files for update to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'technical_planning', 'production')
);

create policy "case_files_delete_internal"
on public.case_files for delete to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'technical_planning')
);
