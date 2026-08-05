-- =============================================================
-- 0040 · Fase 7 · Go-live, Billing Real, Jobs Assíncronos, Confiabilidade
--
-- Adições sobre a fundação SaaS da Fase 6:
--   • organizations: campos externos de billing (stripe_customer_id, etc)
--   • plans: price IDs por ciclo (mensal/anual)
--   • billing_events: idempotência de webhooks
--   • job_status: adiciona 'dead_letter'
--   • cron_runs: lock e histórico de crons
--   • email_outbox + email_events: pipeline transacional + tracking
--   • notification_channels: Slack/Discord/Teams por org
--   • operational_alerts: alertas internos
--   • tenant_domains: campos de verificação DNS real
--   • dunning_policies: configuração da política de inadimplência
-- =============================================================

-- ─── organizations: billing externo ─────────────────────────
alter table public.organizations
  add column if not exists stripe_customer_id text,
  add column if not exists dunning_stage smallint not null default 0,
  add column if not exists dunning_last_event_at timestamptz;

create unique index if not exists organizations_stripe_customer_uk
  on public.organizations (stripe_customer_id)
  where stripe_customer_id is not null;

-- ─── plans: price IDs por ciclo ─────────────────────────────
alter table public.plans
  add column if not exists stripe_price_id_monthly text,
  add column if not exists stripe_price_id_yearly text,
  add column if not exists recommended boolean not null default false;

-- ─── subscriptions: ids externos adicionais ─────────────────
alter table public.subscriptions
  add column if not exists stripe_price_id text;

-- ─── billing_events (idempotência de webhooks) ──────────────
create table if not exists public.billing_events (
  id                    uuid primary key default gen_random_uuid(),
  provider              text not null,
  external_event_id     text not null,
  event_type            text not null,
  organization_id       uuid references public.organizations(id) on delete set null,
  payload_hash          text not null,
  payload               jsonb,                       -- sanitizado, sem cartão
  status                text not null default 'received',   -- 'received' | 'processed' | 'failed' | 'skipped'
  error                 text,
  received_at           timestamptz not null default timezone('utc', now()),
  processed_at          timestamptz,
  unique (provider, external_event_id)
);

create index if not exists billing_events_org_idx on public.billing_events (organization_id, received_at desc);
create index if not exists billing_events_status_idx on public.billing_events (status, received_at desc);

alter table public.billing_events enable row level security;
alter table public.billing_events force row level security;

drop policy if exists "billing_events_platform_only" on public.billing_events;
create policy "billing_events_platform_only"
on public.billing_events for select to authenticated
using (public.is_platform_admin());

-- ─── jobs: adicionar 'dead_letter' ao enum ──────────────────
do $$ begin
  alter type public.job_status add value if not exists 'dead_letter';
exception when others then null; end $$;

-- ─── jobs: adicionar novos kinds ────────────────────────────
do $$ begin
  alter type public.job_kind add value if not exists 'lgpd_export';
exception when others then null; end $$;
do $$ begin
  alter type public.job_kind add value if not exists 'lgpd_deletion';
exception when others then null; end $$;
do $$ begin
  alter type public.job_kind add value if not exists 'domain_verify';
exception when others then null; end $$;

alter table public.jobs
  add column if not exists correlation_id uuid,
  add column if not exists dead_lettered_at timestamptz,
  add column if not exists dead_letter_reason text;

create index if not exists jobs_dead_letter_idx on public.jobs (status, dead_lettered_at desc)
  where status = 'dead_letter';

-- ─── cron_runs (lock + histórico) ───────────────────────────
create table if not exists public.cron_runs (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  started_at     timestamptz not null default timezone('utc', now()),
  completed_at   timestamptz,
  status         text not null default 'running',   -- 'running' | 'success' | 'failed' | 'cancelled'
  worker_id      text,
  error          text,
  metrics        jsonb not null default '{}'::jsonb
);

create index if not exists cron_runs_name_idx on public.cron_runs (name, started_at desc);

-- Impede duas execuções ativas do mesmo cron
create unique index if not exists cron_runs_active_uk
  on public.cron_runs (name)
  where status = 'running';

alter table public.cron_runs enable row level security;
alter table public.cron_runs force row level security;

drop policy if exists "cron_runs_platform_only" on public.cron_runs;
create policy "cron_runs_platform_only"
on public.cron_runs for select to authenticated
using (public.is_platform_admin());

-- ─── email_outbox (fila lógica de e-mails) ──────────────────
create table if not exists public.email_outbox (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations(id) on delete cascade,
  to_email         text not null,
  from_email       text,
  from_name        text,
  reply_to         text,
  template         text not null,
  data             jsonb not null default '{}'::jsonb,
  subject          text,
  status           text not null default 'queued',    -- 'queued' | 'sending' | 'sent' | 'failed' | 'bounced' | 'complained' | 'skipped'
  attempts         smallint not null default 0,
  provider         text,
  provider_message_id text,
  error            text,
  scheduled_at     timestamptz not null default timezone('utc', now()),
  sent_at          timestamptz,
  created_at       timestamptz not null default timezone('utc', now())
);

create index if not exists email_outbox_status_idx on public.email_outbox (status, scheduled_at);
create index if not exists email_outbox_org_idx on public.email_outbox (organization_id, created_at desc);

alter table public.email_outbox enable row level security;
alter table public.email_outbox force row level security;

drop policy if exists "email_outbox_admin_select" on public.email_outbox;
create policy "email_outbox_admin_select"
on public.email_outbox for select to authenticated
using (
  (organization_id = public.current_user_organization_id()
   and public.current_user_role() in ('super_admin','admin'))
  or public.is_platform_admin()
);

-- ─── email_events (tracking Postmark/Resend/SendGrid) ───────
create table if not exists public.email_events (
  id                   bigserial primary key,
  organization_id      uuid references public.organizations(id) on delete set null,
  outbox_id            uuid references public.email_outbox(id) on delete set null,
  provider             text not null,
  provider_message_id  text,
  event_type           text not null,   -- 'delivered' | 'bounced' | 'complained' | 'opened' | 'clicked'
  reason               text,
  metadata             jsonb not null default '{}'::jsonb,
  occurred_at          timestamptz not null default timezone('utc', now())
);

create index if not exists email_events_outbox_idx on public.email_events (outbox_id);
create index if not exists email_events_org_idx on public.email_events (organization_id, occurred_at desc);

alter table public.email_events enable row level security;
alter table public.email_events force row level security;

drop policy if exists "email_events_select" on public.email_events;
create policy "email_events_select"
on public.email_events for select to authenticated
using (
  (organization_id = public.current_user_organization_id()
   and public.current_user_role() in ('super_admin','admin'))
  or public.is_platform_admin()
);

-- ─── notification_channels (Slack/Discord/Teams por org) ─────
create table if not exists public.notification_channels (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations(id) on delete cascade,   -- null = plataforma
  kind             text not null,                    -- 'email' | 'slack' | 'discord' | 'teams' | 'webhook'
  target           text not null,                    -- webhook URL ou email
  enabled          boolean not null default true,
  events           text[] not null default '{}',     -- ['billing_failure','job_dead_letter',...]
  created_at       timestamptz not null default timezone('utc', now())
);

create index if not exists nc_org_idx on public.notification_channels (organization_id);

alter table public.notification_channels enable row level security;
alter table public.notification_channels force row level security;

drop policy if exists "nc_admin_select" on public.notification_channels;
create policy "nc_admin_select"
on public.notification_channels for select to authenticated
using (
  (organization_id = public.current_user_organization_id()
   and public.current_user_role() in ('super_admin','admin'))
  or public.is_platform_admin()
);

drop policy if exists "nc_admin_write" on public.notification_channels;
create policy "nc_admin_write"
on public.notification_channels for all to authenticated
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

-- ─── operational_alerts ─────────────────────────────────────
create table if not exists public.operational_alerts (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations(id) on delete set null,
  source           text not null,   -- 'billing' | 'jobs' | 'webhooks' | 'workers' | 'domains' | 'storage' | ...
  severity         text not null,   -- 'info' | 'warning' | 'error' | 'critical'
  title            text not null,
  message          text,
  metadata         jsonb not null default '{}'::jsonb,
  acknowledged_at  timestamptz,
  acknowledged_by  uuid references auth.users(id) on delete set null,
  resolved_at      timestamptz,
  created_at       timestamptz not null default timezone('utc', now())
);

create index if not exists op_alerts_source_idx on public.operational_alerts (source, created_at desc);
create index if not exists op_alerts_unresolved_idx on public.operational_alerts (created_at desc) where resolved_at is null;

alter table public.operational_alerts enable row level security;
alter table public.operational_alerts force row level security;

drop policy if exists "op_alerts_platform_only" on public.operational_alerts;
create policy "op_alerts_platform_only"
on public.operational_alerts for select to authenticated
using (public.is_platform_admin());

-- ─── tenant_domains: campos de verificação DNS real ─────────
alter table public.tenant_domains
  add column if not exists dns_record_type text default 'TXT',
  add column if not exists dns_record_name text,
  add column if not exists last_check_at timestamptz,
  add column if not exists check_error text,
  add column if not exists disabled_at timestamptz;

-- ─── dunning_policies (config por org da política de cobrança) ─
create table if not exists public.dunning_policies (
  organization_id  uuid primary key references public.organizations(id) on delete cascade,
  day_0_notify     boolean not null default true,
  day_3_banner     boolean not null default true,
  day_7_past_due   boolean not null default true,
  day_15_readonly  boolean not null default true,
  day_30_suspend   boolean not null default true,
  custom_grace_days smallint,
  updated_at       timestamptz not null default timezone('utc', now())
);

alter table public.dunning_policies enable row level security;
alter table public.dunning_policies force row level security;

drop policy if exists "dp_platform_only" on public.dunning_policies;
create policy "dp_platform_only"
on public.dunning_policies for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- ─── data_export_requests: campos de segurança ──────────────
alter table public.data_export_requests
  add column if not exists download_count int not null default 0,
  add column if not exists max_downloads int not null default 3;

-- ─── Seed Stripe price IDs vazios (config via SQL ou UI depois) ─
-- Deixamos NULL. O seed real acontece via env vars ou super admin UI.

-- ─── Helper: try to acquire cron lock ──────────────────────
create or replace function public.try_acquire_cron_lock(
  p_name text,
  p_worker_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Recuperar cron abandonado (running > 30min)
  update public.cron_runs
    set status = 'failed',
        completed_at = timezone('utc', now()),
        error = coalesce(error, 'abandoned')
    where name = p_name
      and status = 'running'
      and started_at < timezone('utc', now()) - interval '30 minutes';

  insert into public.cron_runs (name, worker_id)
  values (p_name, p_worker_id)
  on conflict do nothing
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.try_acquire_cron_lock(text, text) to authenticated;

create or replace function public.release_cron_lock(
  p_id uuid,
  p_status text,
  p_error text default null,
  p_metrics jsonb default null
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.cron_runs
    set status = p_status,
        completed_at = timezone('utc', now()),
        error = p_error,
        metrics = coalesce(p_metrics, metrics)
    where id = p_id;
$$;

grant execute on function public.release_cron_lock(uuid, text, text, jsonb) to authenticated;

-- ─── View KPIs plataforma ───────────────────────────────────
create or replace view public.v_platform_kpis
with (security_invoker = true)
as
select
  (select count(*) from public.organizations where deleted_at is null) as total_tenants,
  (select count(*) from public.organizations where subscription_status = 'active' and deleted_at is null) as active_tenants,
  (select count(*) from public.organizations where subscription_status = 'trial' and deleted_at is null) as trial_tenants,
  (select count(*) from public.organizations where subscription_status in ('past_due','suspended') and deleted_at is null) as delinquent_tenants,
  (select coalesce(sum(p.monthly_price),0)
     from public.subscriptions s
     join public.plans p on p.id = s.plan_id
     where s.status = 'active' and s.billing_cycle = 'monthly') as mrr_monthly_only,
  (select coalesce(sum(p.yearly_price / 12.0),0)
     from public.subscriptions s
     join public.plans p on p.id = s.plan_id
     where s.status = 'active' and s.billing_cycle = 'yearly') as mrr_from_annual,
  (select count(*) from public.jobs where status = 'dead_letter') as dead_letter_jobs,
  (select count(*) from public.jobs where status = 'failed' and updated_at > timezone('utc', now()) - interval '24 hours') as failed_jobs_24h,
  (select count(*) from public.operational_alerts where resolved_at is null and severity in ('error','critical')) as open_critical_alerts;

grant select on public.v_platform_kpis to authenticated;
