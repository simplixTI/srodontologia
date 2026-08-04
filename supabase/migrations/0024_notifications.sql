-- =============================================================
-- 0024 · notifications (in-app center + adapter-ready fields)
-- =============================================================

create table if not exists public.notifications (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  case_id           uuid references public.cases(id) on delete set null,
  type              text not null,                      -- e.g. new_case, quote_available, message
  title             text not null,
  message           text,
  action_url        text,
  channel           public.notification_channel not null default 'in_app',
  status            public.notification_status not null default 'pending',
  read_at           timestamptz,
  sent_at           timestamptz,
  created_at        timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;
alter table public.notifications force row level security;

drop policy if exists "notif_select_own"   on public.notifications;
drop policy if exists "notif_update_own"   on public.notifications;
drop policy if exists "notif_insert_any"   on public.notifications;

create policy "notif_select_own"
on public.notifications for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and user_id = auth.uid()
);

-- Users can mark their own notifications as read
create policy "notif_update_own"
on public.notifications for update to authenticated
using (
  organization_id = public.current_user_organization_id()
  and user_id = auth.uid()
);

-- Any authenticated user can create notifications for others in the same org
-- (server actions will use service role for security-critical dispatches)
create policy "notif_insert_any"
on public.notifications for insert to authenticated
with check (
  organization_id = public.current_user_organization_id()
);
