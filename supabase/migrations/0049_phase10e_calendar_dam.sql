-- =============================================================
-- 0049 · Fase 10E · Agenda + DAM (Digital Asset Management)
--
-- Bloco Agenda:
--   • calendar_events         — eventos por org, com kind (pickup/
--                                delivery/production/meeting/return/
--                                deadline/sla), all_day, location
--   • calendar_event_attendees — participantes (interno) com response
--   • RPC generate_ics(event_id) — retorna ICS para export
--
-- Bloco DAM:
--   • file_tags               — tags coloridas por org
--   • file_tag_assignments    — join case_files ↔ file_tags
--   • file_collections        — coleções nomeadas (pastas virtuais)
--   • file_collection_items   — join com posição
--   • file_favorites          — favoritos por usuário
--   • case_files +view_count/preview_status (aditivos)
-- =============================================================

-- ─── enums ──────────────────────────────────────────────────
do $$ begin
  create type public.calendar_event_kind as enum (
    'pickup', 'delivery', 'production', 'meeting', 'return',
    'deadline', 'sla', 'internal', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attendee_response as enum (
    'pending', 'accepted', 'declined', 'tentative'
  );
exception when duplicate_object then null; end $$;

-- ─── calendar_events ────────────────────────────────────────
create table if not exists public.calendar_events (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  kind              public.calendar_event_kind not null default 'other',
  title             text not null,
  description       text,
  start_at          timestamptz not null,
  end_at            timestamptz not null,
  all_day           boolean not null default false,
  location          text,
  color             text not null default '#3B82F6',
  case_id           uuid references public.cases(id) on delete set null,
  source_type       text,               -- 'delivery' | 'production_card' | 'manifest' | 'manual'
  source_id         uuid,
  cancelled_at      timestamptz,
  cancelled_reason  text,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now()),
  check (end_at >= start_at)
);

create index if not exists cal_events_org_time_idx on public.calendar_events (organization_id, start_at);
create index if not exists cal_events_case_idx on public.calendar_events (case_id) where case_id is not null;
create index if not exists cal_events_source_idx on public.calendar_events (source_type, source_id);
create index if not exists cal_events_kind_idx on public.calendar_events (organization_id, kind, start_at);

drop trigger if exists set_updated_at_calendar_events on public.calendar_events;
create trigger set_updated_at_calendar_events
before update on public.calendar_events
for each row execute function public.set_updated_at();

alter table public.calendar_events enable row level security;
alter table public.calendar_events force row level security;

drop policy if exists "cal_events_select" on public.calendar_events;
create policy "cal_events_select"
on public.calendar_events for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

drop policy if exists "cal_events_write" on public.calendar_events;
create policy "cal_events_write"
on public.calendar_events for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
)
with check (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

-- ─── calendar_event_attendees ───────────────────────────────
create table if not exists public.calendar_event_attendees (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  event_id          uuid not null references public.calendar_events(id) on delete cascade,
  profile_id        uuid not null references public.profiles(id) on delete cascade,
  response          public.attendee_response not null default 'pending',
  responded_at      timestamptz,
  created_at        timestamptz not null default timezone('utc', now()),
  unique (event_id, profile_id)
);

create index if not exists cal_attendees_event_idx on public.calendar_event_attendees (event_id);
create index if not exists cal_attendees_profile_idx on public.calendar_event_attendees (profile_id, event_id);

alter table public.calendar_event_attendees enable row level security;
alter table public.calendar_event_attendees force row level security;

drop policy if exists "cal_att_select" on public.calendar_event_attendees;
create policy "cal_att_select"
on public.calendar_event_attendees for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

drop policy if exists "cal_att_write" on public.calendar_event_attendees;
create policy "cal_att_write"
on public.calendar_event_attendees for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
)
with check (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

-- ─── RPC: generate_ics ──────────────────────────────────────
-- Gera arquivo ICS mínimo para 1 evento
create or replace function public.generate_ics(p_event_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  ev public.calendar_events;
  ics text;
begin
  select * into ev from public.calendar_events where id = p_event_id;
  if ev.id is null then return null; end if;

  ics :=
    'BEGIN:VCALENDAR' || E'\r\n' ||
    'VERSION:2.0' || E'\r\n' ||
    'PRODID:-//SR Digital//pt-BR' || E'\r\n' ||
    'BEGIN:VEVENT' || E'\r\n' ||
    'UID:' || ev.id::text || '@sr.digital' || E'\r\n' ||
    'DTSTAMP:' || to_char(now() at time zone 'UTC', 'YYYYMMDD"T"HH24MISS"Z"') || E'\r\n' ||
    'DTSTART:' || to_char(ev.start_at at time zone 'UTC', 'YYYYMMDD"T"HH24MISS"Z"') || E'\r\n' ||
    'DTEND:' || to_char(ev.end_at at time zone 'UTC', 'YYYYMMDD"T"HH24MISS"Z"') || E'\r\n' ||
    'SUMMARY:' || replace(ev.title, E'\n', ' ') || E'\r\n' ||
    coalesce('DESCRIPTION:' || replace(coalesce(ev.description, ''), E'\n', ' ') || E'\r\n', '') ||
    coalesce('LOCATION:' || replace(ev.location, E'\n', ' ') || E'\r\n', '') ||
    'END:VEVENT' || E'\r\n' ||
    'END:VCALENDAR' || E'\r\n';

  return ics;
end;
$$;

grant execute on function public.generate_ics(uuid) to authenticated;

-- =============================================================
-- DAM (Digital Asset Management)
-- =============================================================

-- ─── file_tags ──────────────────────────────────────────────
create table if not exists public.file_tags (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  name              text not null,
  color             text not null default '#6B7280',
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default timezone('utc', now()),
  unique (organization_id, name)
);

create index if not exists file_tags_org_idx on public.file_tags (organization_id);

alter table public.file_tags enable row level security;
alter table public.file_tags force row level security;

drop policy if exists "file_tags_select" on public.file_tags;
create policy "file_tags_select"
on public.file_tags for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

drop policy if exists "file_tags_write" on public.file_tags;
create policy "file_tags_write"
on public.file_tags for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
)
with check (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

-- ─── file_tag_assignments ───────────────────────────────────
create table if not exists public.file_tag_assignments (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  file_id           uuid not null references public.case_files(id) on delete cascade,
  tag_id            uuid not null references public.file_tags(id) on delete cascade,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default timezone('utc', now()),
  unique (file_id, tag_id)
);

create index if not exists fta_file_idx on public.file_tag_assignments (file_id);
create index if not exists fta_tag_idx on public.file_tag_assignments (tag_id);

alter table public.file_tag_assignments enable row level security;
alter table public.file_tag_assignments force row level security;

drop policy if exists "fta_select" on public.file_tag_assignments;
create policy "fta_select"
on public.file_tag_assignments for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

drop policy if exists "fta_write" on public.file_tag_assignments;
create policy "fta_write"
on public.file_tag_assignments for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
)
with check (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

-- ─── file_collections ───────────────────────────────────────
create table if not exists public.file_collections (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  name              text not null,
  description       text,
  color             text not null default '#3B82F6',
  is_shared         boolean not null default true,   -- true = todos da org; false = pessoal
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now()),
  unique (organization_id, name)
);

create index if not exists fc_org_idx on public.file_collections (organization_id);

drop trigger if exists set_updated_at_file_collections on public.file_collections;
create trigger set_updated_at_file_collections
before update on public.file_collections
for each row execute function public.set_updated_at();

alter table public.file_collections enable row level security;
alter table public.file_collections force row level security;

drop policy if exists "fc_select" on public.file_collections;
create policy "fc_select"
on public.file_collections for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
  and (is_shared or created_by = auth.uid())
);

drop policy if exists "fc_write" on public.file_collections;
create policy "fc_write"
on public.file_collections for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
)
with check (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

-- ─── file_collection_items ──────────────────────────────────
create table if not exists public.file_collection_items (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  collection_id     uuid not null references public.file_collections(id) on delete cascade,
  file_id           uuid not null references public.case_files(id) on delete cascade,
  position          int not null default 0,
  added_by          uuid references auth.users(id) on delete set null,
  added_at          timestamptz not null default timezone('utc', now()),
  unique (collection_id, file_id)
);

create index if not exists fci_collection_idx on public.file_collection_items (collection_id, position);
create index if not exists fci_file_idx on public.file_collection_items (file_id);

alter table public.file_collection_items enable row level security;
alter table public.file_collection_items force row level security;

drop policy if exists "fci_select" on public.file_collection_items;
create policy "fci_select"
on public.file_collection_items for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

drop policy if exists "fci_write" on public.file_collection_items;
create policy "fci_write"
on public.file_collection_items for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
)
with check (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

-- ─── file_favorites ─────────────────────────────────────────
create table if not exists public.file_favorites (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  file_id           uuid not null references public.case_files(id) on delete cascade,
  created_at        timestamptz not null default timezone('utc', now()),
  unique (user_id, file_id)
);

create index if not exists ff_user_idx on public.file_favorites (user_id);
create index if not exists ff_file_idx on public.file_favorites (file_id);

alter table public.file_favorites enable row level security;
alter table public.file_favorites force row level security;

drop policy if exists "ff_select" on public.file_favorites;
create policy "ff_select"
on public.file_favorites for select to authenticated
using (user_id = auth.uid());

drop policy if exists "ff_write" on public.file_favorites;
create policy "ff_write"
on public.file_favorites for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ─── view: DAM aggregate por file ───────────────────────────
create or replace view public.v_dam_file_summary
with (security_invoker = true)
as
select
  f.id                                    as file_id,
  f.organization_id,
  f.case_id,
  (select array_agg(t.name)
     from public.file_tag_assignments ta
     join public.file_tags t on t.id = ta.tag_id
     where ta.file_id = f.id)             as tag_names,
  exists (
    select 1 from public.file_favorites ff
     where ff.file_id = f.id and ff.user_id = auth.uid()
  )                                       as is_favorite,
  (select count(*)::int from public.file_collection_items fci where fci.file_id = f.id) as collection_count
from public.case_files f;

grant select on public.v_dam_file_summary to authenticated;
