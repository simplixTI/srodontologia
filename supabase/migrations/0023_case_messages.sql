-- =============================================================
-- 0023 · case_messages
-- CRITICAL: `visibility = 'internal'` must NEVER be returned to dentists
-- =============================================================

create table if not exists public.case_messages (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  case_id           uuid not null references public.cases(id) on delete cascade,
  sender_id         uuid not null references auth.users(id) on delete restrict,
  message           text not null,
  visibility        public.message_visibility not null default 'dentist',   -- 'internal' | 'dentist'
  reply_to_id       uuid references public.case_messages(id) on delete set null,
  edited_at         timestamptz,
  created_at        timestamptz not null default timezone('utc', now()),
  archived_at       timestamptz
);

create index if not exists case_messages_case_idx
  on public.case_messages (case_id, created_at desc) where archived_at is null;

alter table public.case_messages enable row level security;
alter table public.case_messages force row level security;

drop policy if exists "case_messages_select_internal" on public.case_messages;
drop policy if exists "case_messages_select_dentist"  on public.case_messages;
drop policy if exists "case_messages_insert_internal" on public.case_messages;
drop policy if exists "case_messages_insert_dentist"  on public.case_messages;

-- Internal staff sees everything
create policy "case_messages_select_internal"
on public.case_messages for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

-- Dentist sees ONLY 'dentist' visibility messages of their own cases
create policy "case_messages_select_dentist"
on public.case_messages for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and visibility = 'dentist'
  and exists (
    select 1
    from public.cases c
    join public.dentists d on d.id = c.dentist_id
    where c.id = case_messages.case_id
      and d.profile_id = auth.uid()
  )
);

create policy "case_messages_insert_internal"
on public.case_messages for insert to authenticated
with check (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
  and sender_id = auth.uid()
);

-- Dentist can only send visibility='dentist' messages to their own cases
create policy "case_messages_insert_dentist"
on public.case_messages for insert to authenticated
with check (
  organization_id = public.current_user_organization_id()
  and visibility = 'dentist'
  and sender_id = auth.uid()
  and exists (
    select 1
    from public.cases c
    join public.dentists d on d.id = c.dentist_id
    where c.id = case_messages.case_id
      and d.profile_id = auth.uid()
  )
);
