-- =============================================================
-- 0039 · Fase 6 · Fundação SaaS enterprise
--
-- Transforma o produto em SaaS multi-tenant comercial.
--
-- Escopos:
--   • organizations → tenants (extensão com plano, status, branding,
--     domínio, owner, saúde)
--   • profiles.platform_role — separa administração da PLATAFORMA da
--     administração do tenant
--   • plans + subscriptions + invoices + payment_methods (billing)
--   • feature_flags + overrides (por plano/tenant/usuário/role)
--   • tenant_usage_counters (enforcement de limites)
--   • tenant_domains (white-label + custom domain)
--   • team_invitations (convites com token)
--   • impersonation_sessions (suporte auditado)
--   • support_tickets + messages
--   • data_export_requests + data_deletion_requests (LGPD)
--   • user_totp_secrets + security_events (2FA + auditoria)
--
-- Todas as novas tabelas com RLS strict. Escrita cross-tenant só via
-- SERVICE ROLE ou platform admin.
-- =============================================================

-- ─── Enums ──────────────────────────────────────────────────
do $$ begin
  create type public.subscription_status as enum (
    'trial', 'active', 'past_due', 'suspended', 'cancelled', 'expired'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.billing_cycle as enum ('monthly', 'yearly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invoice_status as enum (
    'draft', 'open', 'paid', 'past_due', 'void', 'refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ff_target_type as enum ('plan', 'tenant', 'user', 'role');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tenant_domain_status as enum ('pending', 'verified', 'active', 'error');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.support_ticket_status as enum (
    'open', 'in_progress', 'waiting_user', 'resolved', 'closed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.support_ticket_priority as enum ('low', 'medium', 'high', 'urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.data_request_status as enum (
    'pending', 'processing', 'completed', 'failed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

-- ─── Estende organizations (tenants) ───────────────────────
alter table public.organizations
  add column if not exists slug text unique,
  add column if not exists plan_id uuid,
  add column if not exists subscription_status public.subscription_status not null default 'trial',
  add column if not exists trial_ends_at timestamptz,
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text,
  add column if not exists deleted_at timestamptz,
  add column if not exists branding jsonb not null default '{}'::jsonb,
  add column if not exists custom_domain text,
  add column if not exists health_score smallint,
  add column if not exists last_activity_at timestamptz;

create index if not exists organizations_slug_idx on public.organizations (slug) where slug is not null;
create index if not exists organizations_status_idx on public.organizations (subscription_status) where deleted_at is null;
create index if not exists organizations_custom_domain_idx on public.organizations (custom_domain) where custom_domain is not null;

-- ─── profiles.platform_role ────────────────────────────────
alter table public.profiles
  add column if not exists platform_role text
    check (platform_role in ('super', 'support'));

create index if not exists profiles_platform_role_idx on public.profiles (platform_role) where platform_role is not null;

-- Helper: is caller a platform admin?
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and platform_role in ('super', 'support')
      and status = 'active'
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

-- ─── plans ─────────────────────────────────────────────────
create table if not exists public.plans (
  id                uuid primary key default gen_random_uuid(),
  code              text unique not null,     -- 'starter' | 'professional' | 'business' | 'enterprise'
  name              text not null,
  description       text,
  monthly_price     numeric(10,2) not null default 0,
  yearly_price      numeric(10,2) not null default 0,
  currency          text not null default 'BRL',
  is_public         boolean not null default true,
  sort_order        smallint not null default 0,
  -- Limites (null = ilimitado)
  max_users         int,
  max_clinics       int,
  max_dentists      int,
  max_cases_month   int,
  max_storage_gb    int,
  max_ocr_month     int,
  max_ai_tokens_month int,
  max_api_calls_month int,
  max_automations   int,
  max_webhooks      int,
  -- Features (booleans)
  features          jsonb not null default '{
    "api_access": true,
    "webhooks": true,
    "automations": true,
    "white_label": false,
    "custom_domain": false,
    "priority_support": false,
    "sso": false,
    "advanced_reports": false,
    "portal_dentist": true,
    "ocr": true,
    "ai_assistants": true,
    "image_analysis": false
  }'::jsonb,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_plans_updated_at on public.plans;
create trigger trg_plans_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

alter table public.plans enable row level security;
alter table public.plans force row level security;

drop policy if exists "plans_select_public" on public.plans;
create policy "plans_select_public"
on public.plans for select to authenticated
using (is_public = true or public.is_platform_admin());

drop policy if exists "plans_write_platform" on public.plans;
create policy "plans_write_platform"
on public.plans for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- FK organizations.plan_id → plans
do $$ begin
  alter table public.organizations
    add constraint organizations_plan_fk
    foreign key (plan_id) references public.plans(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ─── subscriptions ─────────────────────────────────────────
create table if not exists public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  plan_id               uuid not null references public.plans(id) on delete restrict,
  status                public.subscription_status not null default 'trial',
  billing_cycle         public.billing_cycle not null default 'monthly',
  trial_ends_at         timestamptz,
  current_period_start  timestamptz not null default timezone('utc', now()),
  current_period_end    timestamptz not null,
  cancel_at_period_end  boolean not null default false,
  cancelled_at          timestamptz,
  external_provider     text,        -- 'stripe' | 'mp' | 'asaas' | 'iugu' | 'pagarme'
  external_ref          text,
  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create index if not exists subscriptions_org_idx on public.subscriptions (organization_id, created_at desc);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

alter table public.subscriptions enable row level security;
alter table public.subscriptions force row level security;

drop policy if exists "subscriptions_select_org_admin" on public.subscriptions;
create policy "subscriptions_select_org_admin"
on public.subscriptions for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','finance')
);

drop policy if exists "subscriptions_all_platform" on public.subscriptions;
create policy "subscriptions_all_platform"
on public.subscriptions for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- ─── subscription_events (audit trail) ─────────────────────
create table if not exists public.subscription_events (
  id               uuid primary key default gen_random_uuid(),
  subscription_id  uuid not null references public.subscriptions(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  event_type       text not null,  -- 'created'|'upgraded'|'downgraded'|'trial_extended'|'payment_succeeded'|'payment_failed'|'cancelled'|'reactivated'|'suspended'|'reinstated'
  from_plan_id     uuid references public.plans(id) on delete set null,
  to_plan_id       uuid references public.plans(id) on delete set null,
  actor_id         uuid references auth.users(id) on delete set null,
  metadata         jsonb not null default '{}'::jsonb,
  occurred_at      timestamptz not null default timezone('utc', now())
);

create index if not exists subscription_events_org_idx on public.subscription_events (organization_id, occurred_at desc);
create index if not exists subscription_events_sub_idx on public.subscription_events (subscription_id, occurred_at desc);

alter table public.subscription_events enable row level security;
alter table public.subscription_events force row level security;

drop policy if exists "sub_events_select" on public.subscription_events;
create policy "sub_events_select"
on public.subscription_events for select to authenticated
using (
  (organization_id = public.current_user_organization_id()
   and public.current_user_role() in ('super_admin','admin','finance'))
  or public.is_platform_admin()
);

-- ─── invoices ──────────────────────────────────────────────
create table if not exists public.invoices (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  subscription_id   uuid references public.subscriptions(id) on delete set null,
  invoice_number    text unique,
  status            public.invoice_status not null default 'draft',
  currency          text not null default 'BRL',
  subtotal          numeric(12,2) not null default 0,
  discount          numeric(12,2) not null default 0,
  tax               numeric(12,2) not null default 0,
  total             numeric(12,2) not null default 0,
  due_date          date,
  issued_at         timestamptz,
  paid_at           timestamptz,
  external_provider text,
  external_ref      text,
  hosted_url        text,
  pdf_url           text,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create index if not exists invoices_org_idx on public.invoices (organization_id, issued_at desc);
create index if not exists invoices_status_idx on public.invoices (status, due_date);

alter table public.invoices enable row level security;
alter table public.invoices force row level security;

drop policy if exists "invoices_select" on public.invoices;
create policy "invoices_select"
on public.invoices for select to authenticated
using (
  (organization_id = public.current_user_organization_id()
   and public.current_user_role() in ('super_admin','admin','finance'))
  or public.is_platform_admin()
);

drop policy if exists "invoices_write_platform" on public.invoices;
create policy "invoices_write_platform"
on public.invoices for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- ─── invoice_items ─────────────────────────────────────────
create table if not exists public.invoice_items (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references public.invoices(id) on delete cascade,
  description  text not null,
  quantity     numeric(10,2) not null default 1,
  unit_price   numeric(12,2) not null default 0,
  amount       numeric(12,2) not null default 0,
  sort_order   smallint not null default 0
);

create index if not exists invoice_items_invoice_idx on public.invoice_items (invoice_id, sort_order);

alter table public.invoice_items enable row level security;
alter table public.invoice_items force row level security;

drop policy if exists "invoice_items_select" on public.invoice_items;
create policy "invoice_items_select"
on public.invoice_items for select to authenticated
using (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id
      and (
        (i.organization_id = public.current_user_organization_id()
         and public.current_user_role() in ('super_admin','admin','finance'))
        or public.is_platform_admin()
      )
  )
);

-- ─── payment_methods ───────────────────────────────────────
create table if not exists public.payment_methods (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  provider          text not null,
  external_ref      text not null,
  brand             text,       -- visa/master/etc
  last4             text,
  exp_month         smallint,
  exp_year          smallint,
  is_default        boolean not null default false,
  created_at        timestamptz not null default timezone('utc', now()),
  unique (organization_id, provider, external_ref)
);

create index if not exists payment_methods_org_idx on public.payment_methods (organization_id);

alter table public.payment_methods enable row level security;
alter table public.payment_methods force row level security;

drop policy if exists "pm_select" on public.payment_methods;
create policy "pm_select"
on public.payment_methods for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','finance')
);

-- ─── feature_flags catalog ─────────────────────────────────
create table if not exists public.feature_flags (
  key              text primary key,
  description      text,
  default_enabled  boolean not null default false,
  category         text,
  created_at       timestamptz not null default timezone('utc', now())
);

alter table public.feature_flags enable row level security;
alter table public.feature_flags force row level security;

drop policy if exists "ff_select_all_auth" on public.feature_flags;
create policy "ff_select_all_auth"
on public.feature_flags for select to authenticated using (true);

drop policy if exists "ff_write_platform" on public.feature_flags;
create policy "ff_write_platform"
on public.feature_flags for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- ─── feature_flag_overrides ────────────────────────────────
create table if not exists public.feature_flag_overrides (
  id            uuid primary key default gen_random_uuid(),
  flag_key      text not null references public.feature_flags(key) on delete cascade,
  target_type   public.ff_target_type not null,
  target_id     text not null,          -- plan.id | organization.id | user.id | role name
  enabled       boolean not null,
  reason        text,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default timezone('utc', now()),
  unique (flag_key, target_type, target_id)
);

create index if not exists ffo_flag_idx on public.feature_flag_overrides (flag_key);
create index if not exists ffo_target_idx on public.feature_flag_overrides (target_type, target_id);

alter table public.feature_flag_overrides enable row level security;
alter table public.feature_flag_overrides force row level security;

drop policy if exists "ffo_select_platform_or_own_org" on public.feature_flag_overrides;
create policy "ffo_select_platform_or_own_org"
on public.feature_flag_overrides for select to authenticated
using (
  public.is_platform_admin()
  or (target_type = 'tenant' and target_id = public.current_user_organization_id()::text)
);

drop policy if exists "ffo_write_platform" on public.feature_flag_overrides;
create policy "ffo_write_platform"
on public.feature_flag_overrides for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- Evaluator RPC (SECURITY DEFINER)
create or replace function public.check_feature_flag(
  p_flag_key text,
  p_org_id   uuid default null,
  p_user_id  uuid default null,
  p_role     text default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_default boolean;
  v_hit     boolean;
begin
  select default_enabled into v_default from public.feature_flags where key = p_flag_key;
  if v_default is null then return false; end if;

  -- Precedence: user > role > tenant > plan > default
  if p_user_id is not null then
    select enabled into v_hit
    from public.feature_flag_overrides
    where flag_key = p_flag_key and target_type = 'user' and target_id = p_user_id::text
    limit 1;
    if v_hit is not null then return v_hit; end if;
  end if;

  if p_role is not null then
    select enabled into v_hit
    from public.feature_flag_overrides
    where flag_key = p_flag_key and target_type = 'role' and target_id = p_role
    limit 1;
    if v_hit is not null then return v_hit; end if;
  end if;

  if p_org_id is not null then
    select enabled into v_hit
    from public.feature_flag_overrides
    where flag_key = p_flag_key and target_type = 'tenant' and target_id = p_org_id::text
    limit 1;
    if v_hit is not null then return v_hit; end if;

    -- plan-level: check plan_id of org
    select o_plan.enabled into v_hit
    from public.organizations o
    join public.feature_flag_overrides o_plan on o_plan.target_type = 'plan' and o_plan.target_id = o.plan_id::text and o_plan.flag_key = p_flag_key
    where o.id = p_org_id
    limit 1;
    if v_hit is not null then return v_hit; end if;
  end if;

  return v_default;
end;
$$;

grant execute on function public.check_feature_flag(text, uuid, uuid, text) to authenticated;

-- ─── tenant_usage_counters ─────────────────────────────────
create table if not exists public.tenant_usage_counters (
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  metric           text not null,       -- 'users'|'clinics'|'dentists'|'cases_month'|'storage_bytes'|'ocr_month'|'ai_tokens_month'|'api_calls_month'|'automations'|'webhooks'
  period_start     date,                -- null = perpetuo (users, clinics, ...); else primeiro do mês
  current_value    bigint not null default 0,
  updated_at       timestamptz not null default timezone('utc', now()),
  primary key (organization_id, metric, period_start)
);

alter table public.tenant_usage_counters enable row level security;
alter table public.tenant_usage_counters force row level security;

drop policy if exists "tuc_select" on public.tenant_usage_counters;
create policy "tuc_select"
on public.tenant_usage_counters for select to authenticated
using (
  (organization_id = public.current_user_organization_id() and public.is_internal_user())
  or public.is_platform_admin()
);

create or replace function public.increment_usage(
  p_org_id  uuid,
  p_metric  text,
  p_delta   bigint default 1,
  p_period  date default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new bigint;
begin
  insert into public.tenant_usage_counters (organization_id, metric, period_start, current_value)
  values (p_org_id, p_metric, p_period, greatest(0, p_delta))
  on conflict (organization_id, metric, period_start)
  do update set current_value = greatest(0, tenant_usage_counters.current_value + p_delta),
                updated_at = timezone('utc', now())
  returning current_value into v_new;
  return v_new;
end;
$$;

grant execute on function public.increment_usage(uuid, text, bigint, date) to authenticated;

-- ─── tenant_domains ────────────────────────────────────────
create table if not exists public.tenant_domains (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  hostname            text not null,
  status              public.tenant_domain_status not null default 'pending',
  verification_token  text not null,
  verified_at         timestamptz,
  ssl_ready_at        timestamptz,
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now()),
  unique (hostname)
);

drop trigger if exists trg_tenant_domains_updated_at on public.tenant_domains;
create trigger trg_tenant_domains_updated_at
before update on public.tenant_domains
for each row execute function public.set_updated_at();

alter table public.tenant_domains enable row level security;
alter table public.tenant_domains force row level security;

drop policy if exists "td_select" on public.tenant_domains;
create policy "td_select"
on public.tenant_domains for select to authenticated
using (
  (organization_id = public.current_user_organization_id()
   and public.current_user_role() in ('super_admin','admin'))
  or public.is_platform_admin()
);

drop policy if exists "td_write_admin" on public.tenant_domains;
create policy "td_write_admin"
on public.tenant_domains for all to authenticated
using (
  (organization_id = public.current_user_organization_id()
   and public.current_user_role() in ('super_admin','admin'))
  or public.is_platform_admin()
)
with check (
  (organization_id = public.current_user_organization_id()
   and public.current_user_role() in ('super_admin','admin'))
  or public.is_platform_admin()
);

-- ─── team_invitations ──────────────────────────────────────
create table if not exists public.team_invitations (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  email            citext not null,
  role             text not null,
  token            text not null unique,
  invited_by       uuid references auth.users(id) on delete set null,
  expires_at       timestamptz not null default (timezone('utc', now()) + interval '7 days'),
  accepted_at      timestamptz,
  accepted_by      uuid references auth.users(id) on delete set null,
  cancelled_at     timestamptz,
  created_at       timestamptz not null default timezone('utc', now())
);

create index if not exists team_invitations_org_idx on public.team_invitations (organization_id, created_at desc);
create index if not exists team_invitations_email_idx on public.team_invitations (email);

alter table public.team_invitations enable row level security;
alter table public.team_invitations force row level security;

drop policy if exists "ti_select" on public.team_invitations;
create policy "ti_select"
on public.team_invitations for select to authenticated
using (
  (organization_id = public.current_user_organization_id()
   and public.current_user_role() in ('super_admin','admin'))
  or public.is_platform_admin()
);

drop policy if exists "ti_write_admin" on public.team_invitations;
create policy "ti_write_admin"
on public.team_invitations for all to authenticated
using (
  (organization_id = public.current_user_organization_id()
   and public.current_user_role() in ('super_admin','admin'))
  or public.is_platform_admin()
)
with check (
  (organization_id = public.current_user_organization_id()
   and public.current_user_role() in ('super_admin','admin'))
  or public.is_platform_admin()
);

-- ─── impersonation_sessions ────────────────────────────────
create table if not exists public.impersonation_sessions (
  id                 uuid primary key default gen_random_uuid(),
  actor_id           uuid not null references auth.users(id) on delete cascade,
  target_org_id      uuid not null references public.organizations(id) on delete cascade,
  target_user_id     uuid references auth.users(id) on delete set null,
  reason             text not null,
  ip                 text,
  user_agent         text,
  started_at         timestamptz not null default timezone('utc', now()),
  ended_at           timestamptz,
  session_token      text not null unique
);

create index if not exists imp_sessions_actor_idx on public.impersonation_sessions (actor_id, started_at desc);
create index if not exists imp_sessions_org_idx on public.impersonation_sessions (target_org_id, started_at desc);

alter table public.impersonation_sessions enable row level security;
alter table public.impersonation_sessions force row level security;

drop policy if exists "imp_sessions_select" on public.impersonation_sessions;
create policy "imp_sessions_select"
on public.impersonation_sessions for select to authenticated
using (
  actor_id = auth.uid()
  or public.is_platform_admin()
  or target_org_id = public.current_user_organization_id() and public.current_user_role() in ('super_admin','admin')
);

drop policy if exists "imp_sessions_write_platform" on public.impersonation_sessions;
create policy "imp_sessions_write_platform"
on public.impersonation_sessions for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- ─── support_tickets ───────────────────────────────────────
create table if not exists public.support_tickets (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  subject          text not null,
  description      text,
  status           public.support_ticket_status not null default 'open',
  priority         public.support_ticket_priority not null default 'medium',
  created_by       uuid references auth.users(id) on delete set null,
  assigned_to      uuid references auth.users(id) on delete set null,
  resolved_at      timestamptz,
  closed_at        timestamptz,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_support_tickets_updated_at on public.support_tickets;
create trigger trg_support_tickets_updated_at
before update on public.support_tickets
for each row execute function public.set_updated_at();

create index if not exists support_tickets_org_idx on public.support_tickets (organization_id, created_at desc);
create index if not exists support_tickets_status_idx on public.support_tickets (status, priority);

alter table public.support_tickets enable row level security;
alter table public.support_tickets force row level security;

drop policy if exists "st_select" on public.support_tickets;
create policy "st_select"
on public.support_tickets for select to authenticated
using (
  (organization_id = public.current_user_organization_id() and public.is_internal_user())
  or public.is_platform_admin()
);

drop policy if exists "st_write" on public.support_tickets;
create policy "st_write"
on public.support_tickets for all to authenticated
using (
  (organization_id = public.current_user_organization_id() and public.is_internal_user())
  or public.is_platform_admin()
)
with check (
  (organization_id = public.current_user_organization_id() and public.is_internal_user())
  or public.is_platform_admin()
);

create table if not exists public.support_ticket_messages (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references public.support_tickets(id) on delete cascade,
  from_user_id uuid references auth.users(id) on delete set null,
  is_internal  boolean not null default false,
  body         text not null,
  attachments  jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default timezone('utc', now())
);

create index if not exists stm_ticket_idx on public.support_ticket_messages (ticket_id, created_at);

alter table public.support_ticket_messages enable row level security;
alter table public.support_ticket_messages force row level security;

drop policy if exists "stm_select" on public.support_ticket_messages;
create policy "stm_select"
on public.support_ticket_messages for select to authenticated
using (
  exists (
    select 1 from public.support_tickets st
    where st.id = ticket_id
      and (
        (st.organization_id = public.current_user_organization_id() and public.is_internal_user())
        or public.is_platform_admin()
      )
  )
);

drop policy if exists "stm_insert" on public.support_ticket_messages;
create policy "stm_insert"
on public.support_ticket_messages for insert to authenticated
with check (
  exists (
    select 1 from public.support_tickets st
    where st.id = ticket_id
      and (
        (st.organization_id = public.current_user_organization_id() and public.is_internal_user())
        or public.is_platform_admin()
      )
  )
);

-- ─── data_export_requests (LGPD) ───────────────────────────
create table if not exists public.data_export_requests (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  requested_by     uuid references auth.users(id) on delete set null,
  scope            text not null default 'organization',   -- 'organization'|'user'|'case'
  scope_id         uuid,
  status           public.data_request_status not null default 'pending',
  storage_path     text,
  file_size        bigint,
  requested_at     timestamptz not null default timezone('utc', now()),
  completed_at     timestamptz,
  expires_at       timestamptz,
  error            text
);

create index if not exists der_org_idx on public.data_export_requests (organization_id, requested_at desc);

alter table public.data_export_requests enable row level security;
alter table public.data_export_requests force row level security;

drop policy if exists "der_select" on public.data_export_requests;
create policy "der_select"
on public.data_export_requests for select to authenticated
using (
  (organization_id = public.current_user_organization_id()
   and (requested_by = auth.uid() or public.current_user_role() in ('super_admin','admin')))
  or public.is_platform_admin()
);

drop policy if exists "der_insert" on public.data_export_requests;
create policy "der_insert"
on public.data_export_requests for insert to authenticated
with check (
  (organization_id = public.current_user_organization_id())
  or public.is_platform_admin()
);

-- ─── data_deletion_requests ────────────────────────────────
create table if not exists public.data_deletion_requests (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  requested_by     uuid references auth.users(id) on delete set null,
  scope            text not null default 'organization',
  scope_id         uuid,
  reason           text,
  status           public.data_request_status not null default 'pending',
  scheduled_at     timestamptz,
  executed_at      timestamptz,
  cancelled_at     timestamptz,
  requested_at     timestamptz not null default timezone('utc', now())
);

create index if not exists ddr_org_idx on public.data_deletion_requests (organization_id, requested_at desc);

alter table public.data_deletion_requests enable row level security;
alter table public.data_deletion_requests force row level security;

drop policy if exists "ddr_select" on public.data_deletion_requests;
create policy "ddr_select"
on public.data_deletion_requests for select to authenticated
using (
  (organization_id = public.current_user_organization_id()
   and (requested_by = auth.uid() or public.current_user_role() in ('super_admin','admin')))
  or public.is_platform_admin()
);

drop policy if exists "ddr_insert" on public.data_deletion_requests;
create policy "ddr_insert"
on public.data_deletion_requests for insert to authenticated
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin')
);

-- ─── user_totp_secrets (2FA) ───────────────────────────────
create table if not exists public.user_totp_secrets (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  secret_enc    text not null,                -- encrypted-at-rest (envelope in application)
  verified_at   timestamptz,
  backup_codes  jsonb,                        -- sha256 hashes of one-time codes
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_user_totp_updated_at on public.user_totp_secrets;
create trigger trg_user_totp_updated_at
before update on public.user_totp_secrets
for each row execute function public.set_updated_at();

alter table public.user_totp_secrets enable row level security;
alter table public.user_totp_secrets force row level security;

drop policy if exists "totp_self_only" on public.user_totp_secrets;
create policy "totp_self_only"
on public.user_totp_secrets for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ─── security_events ───────────────────────────────────────
create table if not exists public.security_events (
  id               bigserial primary key,
  organization_id  uuid references public.organizations(id) on delete set null,
  user_id          uuid references auth.users(id) on delete set null,
  event_type       text not null,   -- 'login_success'|'login_failed'|'password_changed'|'2fa_enabled'|'2fa_disabled'|'session_revoked'|'suspicious_activity'|'impersonation_started'|'impersonation_ended'|'api_key_created'|'api_key_revoked'
  ip               text,
  user_agent       text,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default timezone('utc', now())
);

create index if not exists sec_events_org_idx on public.security_events (organization_id, created_at desc);
create index if not exists sec_events_user_idx on public.security_events (user_id, created_at desc);
create index if not exists sec_events_type_idx on public.security_events (event_type, created_at desc);

alter table public.security_events enable row level security;
alter table public.security_events force row level security;

drop policy if exists "sec_events_select" on public.security_events;
create policy "sec_events_select"
on public.security_events for select to authenticated
using (
  user_id = auth.uid()
  or (organization_id = public.current_user_organization_id()
      and public.current_user_role() in ('super_admin','admin'))
  or public.is_platform_admin()
);

-- ─── Seed inicial de planos ────────────────────────────────
insert into public.plans (code, name, description, monthly_price, yearly_price, sort_order,
  max_users, max_clinics, max_dentists, max_cases_month, max_storage_gb,
  max_ocr_month, max_ai_tokens_month, max_api_calls_month, max_automations, max_webhooks,
  features)
values
  ('starter', 'Starter', 'Para laboratórios começando no digital.',
   197.00, 1970.00, 1,
   5, 2, 25, 50, 5,
   100, 200000, 5000, 5, 2,
   '{"api_access":true,"webhooks":true,"automations":true,"white_label":false,"custom_domain":false,"priority_support":false,"sso":false,"advanced_reports":false,"portal_dentist":true,"ocr":true,"ai_assistants":true,"image_analysis":false}'::jsonb),
  ('professional', 'Professional', 'Para laboratórios em crescimento.',
   497.00, 4970.00, 2,
   15, 10, 100, 250, 25,
   500, 1000000, 25000, 25, 10,
   '{"api_access":true,"webhooks":true,"automations":true,"white_label":true,"custom_domain":false,"priority_support":false,"sso":false,"advanced_reports":true,"portal_dentist":true,"ocr":true,"ai_assistants":true,"image_analysis":false}'::jsonb),
  ('business', 'Business', 'Para laboratórios estabelecidos.',
   997.00, 9970.00, 3,
   40, 40, 500, 1000, 100,
   2000, 5000000, 100000, 100, 25,
   '{"api_access":true,"webhooks":true,"automations":true,"white_label":true,"custom_domain":true,"priority_support":true,"sso":false,"advanced_reports":true,"portal_dentist":true,"ocr":true,"ai_assistants":true,"image_analysis":true}'::jsonb),
  ('enterprise', 'Enterprise', 'Sem limites. SLA dedicado.',
   0, 0, 4,
   null, null, null, null, null,
   null, null, null, null, null,
   '{"api_access":true,"webhooks":true,"automations":true,"white_label":true,"custom_domain":true,"priority_support":true,"sso":true,"advanced_reports":true,"portal_dentist":true,"ocr":true,"ai_assistants":true,"image_analysis":true}'::jsonb)
on conflict (code) do nothing;

-- ─── Seed de feature flags ─────────────────────────────────
insert into public.feature_flags (key, description, default_enabled, category) values
  ('ai.image_analysis', 'Análise multimodal de imagens', false, 'ai'),
  ('ai.dentist_assistant', 'Assistente IA para dentistas no portal', true, 'ai'),
  ('ai.case_summary', 'Resumo automático de casos', true, 'ai'),
  ('portal.custom_domain', 'Portal do dentista em domínio próprio', false, 'portal'),
  ('billing.self_upgrade', 'Cliente pode fazer upgrade sozinho', true, 'billing'),
  ('security.2fa_required', 'Exige 2FA para acesso administrativo', false, 'security'),
  ('ops.overdue_auto_notify', 'Notificar admins automaticamente em casos atrasados', true, 'operations'),
  ('exports.pdf_case_report', 'Exportar relatório de caso em PDF', true, 'exports'),
  ('api.public_v1', 'API pública v1 habilitada', true, 'api')
on conflict (key) do nothing;

-- Seed de override: primeira org existente vira 'enterprise'
do $$
declare v_org uuid;
declare v_ent uuid;
begin
  select id into v_org from public.organizations order by created_at limit 1;
  select id into v_ent from public.plans where code = 'enterprise';
  if v_org is not null and v_ent is not null then
    update public.organizations
      set plan_id = v_ent,
          subscription_status = 'active',
          slug = coalesce(slug, 'sr-digital'),
          owner_id = coalesce(owner_id, (select id from auth.users limit 1))
      where id = v_org;
    -- Criar subscription se ainda não existe
    insert into public.subscriptions (organization_id, plan_id, status, billing_cycle,
      current_period_start, current_period_end)
    select v_org, v_ent, 'active', 'yearly',
           timezone('utc', now()), timezone('utc', now()) + interval '1 year'
    where not exists (select 1 from public.subscriptions where organization_id = v_org);
  end if;
end $$;
