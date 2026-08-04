-- =============================================================
-- 0030 · Storage buckets (all private) + object-level RLS
-- Path convention: <organization_id>/<case_id>/<category>/<uuid-filename>
-- =============================================================

insert into storage.buckets (id, name, public)
values
  ('avatars',         'avatars',         false),
  ('case-files',      'case-files',      false),
  ('planning-files',  'planning-files',  false),
  ('delivery-files',  'delivery-files',  false),
  ('documents',       'documents',       false)
on conflict (id) do nothing;

-- ─── Helper: extract organization_id from path (first segment) ───
create or replace function public.storage_path_org(path text)
returns uuid
language sql
immutable
as $$
  select nullif(split_part(path, '/', 1), '')::uuid;
$$;

-- ─── Helper: extract case_id from path (second segment) ─────
create or replace function public.storage_path_case(path text)
returns uuid
language sql
immutable
as $$
  select nullif(split_part(path, '/', 2), '')::uuid;
$$;

-- ─── case-files bucket policies ─────────────────────────────
drop policy if exists "case_files_bucket_select_internal" on storage.objects;
drop policy if exists "case_files_bucket_select_dentist"  on storage.objects;
drop policy if exists "case_files_bucket_insert_internal" on storage.objects;
drop policy if exists "case_files_bucket_insert_dentist"  on storage.objects;
drop policy if exists "case_files_bucket_delete_internal" on storage.objects;

create policy "case_files_bucket_select_internal"
on storage.objects for select to authenticated
using (
  bucket_id = 'case-files'
  and public.storage_path_org(name) = public.current_user_organization_id()
  and public.is_internal_user()
);

create policy "case_files_bucket_select_dentist"
on storage.objects for select to authenticated
using (
  bucket_id = 'case-files'
  and public.storage_path_org(name) = public.current_user_organization_id()
  and exists (
    select 1
    from public.case_files cf
    join public.cases c on c.id = cf.case_id
    join public.dentists d on d.id = c.dentist_id
    where cf.storage_path = storage.objects.name
      and cf.visibility in ('dentist', 'shared')
      and d.profile_id = auth.uid()
  )
);

create policy "case_files_bucket_insert_internal"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'case-files'
  and public.storage_path_org(name) = public.current_user_organization_id()
  and public.is_internal_user()
);

create policy "case_files_bucket_insert_dentist"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'case-files'
  and public.storage_path_org(name) = public.current_user_organization_id()
  and exists (
    select 1 from public.cases c
    join public.dentists d on d.id = c.dentist_id
    where c.id = public.storage_path_case(storage.objects.name)
      and d.profile_id = auth.uid()
      and c.internal_status = 'draft'
  )
);

create policy "case_files_bucket_delete_internal"
on storage.objects for delete to authenticated
using (
  bucket_id = 'case-files'
  and public.storage_path_org(name) = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'technical_planning')
);

-- ─── avatars: user reads own, admins manage all ─────────────
drop policy if exists "avatars_select_any_auth"    on storage.objects;
drop policy if exists "avatars_write_own"          on storage.objects;

create policy "avatars_select_any_auth"
on storage.objects for select to authenticated
using (bucket_id = 'avatars');

create policy "avatars_write_own"
on storage.objects for all to authenticated
using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- ─── planning-files / delivery-files / documents: internal only ─
drop policy if exists "internal_buckets_all" on storage.objects;

create policy "internal_buckets_all"
on storage.objects for all to authenticated
using (
  bucket_id in ('planning-files', 'delivery-files', 'documents')
  and public.storage_path_org(name) = public.current_user_organization_id()
  and public.is_internal_user()
)
with check (
  bucket_id in ('planning-files', 'delivery-files', 'documents')
  and public.storage_path_org(name) = public.current_user_organization_id()
  and public.is_internal_user()
);
