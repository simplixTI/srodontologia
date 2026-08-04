-- =============================================================
-- 0018 · leads + lead_activities
-- =============================================================

create table if not exists public.leads (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  full_name              text not null,
  clinic_name            text,
  cro_number             text,
  cro_state              text,
  specialty              text,
  email                  citext,
  phone                  text,
  whatsapp               text,
  instagram              text,
  city                   text,
  state                  text,
  source                 text,
  pipeline_stage         public.customer_status not null default 'lead',
  estimated_value        numeric(12,2),
  commercial_owner_id    uuid references public.profiles(id) on delete set null,
  next_follow_up_at      timestamptz,
  lost_reason            text,
  notes                  text,
  converted_dentist_id   uuid references public.dentists(id) on delete set null,
  converted_at           timestamptz,
  created_by             uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default timezone('utc', now()),
  updated_at             timestamptz not null default timezone('utc', now()),
  archived_at            timestamptz
);

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

create index if not exists leads_org_idx        on public.leads (organization_id);
create index if not exists leads_stage_idx      on public.leads (organization_id, pipeline_stage) where archived_at is null;
create index if not exists leads_owner_idx      on public.leads (organization_id, commercial_owner_id);
create index if not exists leads_followup_idx   on public.leads (organization_id, next_follow_up_at) where archived_at is null;

alter table public.leads enable row level security;
alter table public.leads force row level security;

drop policy if exists "leads_select_internal"  on public.leads;
drop policy if exists "leads_write_admin_comm" on public.leads;

create policy "leads_select_internal"
on public.leads for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

create policy "leads_write_admin_comm"
on public.leads for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'commercial')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'commercial')
);

-- ─── lead_activities ─────────────────────────────────────────
create table if not exists public.lead_activities (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  lead_id          uuid not null references public.leads(id) on delete cascade,
  user_id          uuid references auth.users(id) on delete set null,
  activity_type    text not null,           -- call, email, whatsapp, meeting, note, stage_change
  title            text not null,
  description      text,
  scheduled_at     timestamptz,
  completed_at     timestamptz,
  result           text,                     -- outcome
  created_at       timestamptz not null default timezone('utc', now())
);

create index if not exists lead_activities_lead_idx on public.lead_activities (lead_id, created_at desc);

alter table public.lead_activities enable row level security;
alter table public.lead_activities force row level security;

drop policy if exists "lead_activities_select_internal"  on public.lead_activities;
drop policy if exists "lead_activities_write_admin_comm" on public.lead_activities;

create policy "lead_activities_select_internal"
on public.lead_activities for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

create policy "lead_activities_write_admin_comm"
on public.lead_activities for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'commercial')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin', 'admin', 'commercial')
);
