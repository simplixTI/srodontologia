-- =============================================================
-- STEP 4 · 0040 + 0041 + 0042
--
-- Usa valores de enum estendidos no STEP 3. Os 'alter type add
-- value if not exists' aqui dentro viram no-op (idempotente).
--
-- Pré-requisitos: STEPs 1, 2 e 3 executados.
-- =============================================================


-- =============================================================
-- 0040_phase7_production.sql
-- =============================================================

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


-- =============================================================
-- 0041_phase8_launch.sql
-- =============================================================

-- =============================================================
-- 0041 · Fase 8 · Homologação, E2E, Custom Domains, Launch controlado
--
-- Novidades sobre Fase 7:
--   • app_sessions        — camada própria de visibilidade + revogação
--   • domain_verification_history — audit granular de mudanças de domínio
--   • tenant_domains      — estados expandidos + retry/consecutive_failures
--   • legal_documents     — versões dos documentos legais
--   • legal_acceptances   — aceites por usuário
--   • product_feedback    — feedback in-app
--   • product_analytics_events — eventos de produto (fallback quando sem provider)
--   • incidents + incident_updates — status page pública
--   • tenant_release_channels — internal/pilot/beta/production
--   • support_tickets     — sla_hours e sla_due_at
-- =============================================================

-- ─── app_sessions ───────────────────────────────────────────
create table if not exists public.app_sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  organization_id    uuid references public.organizations(id) on delete set null,
  session_hash       text not null,                     -- sha256 do refresh_token id (opaco)
  user_agent         text,
  device_kind        text,                              -- 'mobile' | 'tablet' | 'desktop' | 'other'
  browser            text,
  os                 text,
  ip_hash            text,                              -- sha256(ip + salt)
  first_seen_at      timestamptz not null default timezone('utc', now()),
  last_seen_at       timestamptz not null default timezone('utc', now()),
  revoked_at         timestamptz,
  revoke_reason      text,                              -- 'user' | 'admin' | 'security_event' | 'expired'
  expires_at         timestamptz,
  is_current         boolean not null default true,
  unique (user_id, session_hash)
);

create index if not exists app_sessions_user_idx on public.app_sessions (user_id, last_seen_at desc);
create index if not exists app_sessions_active_idx on public.app_sessions (user_id) where revoked_at is null;

alter table public.app_sessions enable row level security;
alter table public.app_sessions force row level security;

drop policy if exists "app_sessions_self_select" on public.app_sessions;
create policy "app_sessions_self_select"
on public.app_sessions for select to authenticated
using (user_id = auth.uid() or public.is_platform_admin());

drop policy if exists "app_sessions_self_update" on public.app_sessions;
create policy "app_sessions_self_update"
on public.app_sessions for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ─── domain_verification_history ────────────────────────────
create table if not exists public.domain_verification_history (
  id             uuid primary key default gen_random_uuid(),
  domain_id      uuid not null references public.tenant_domains(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  action         text not null,   -- 'created' | 'verify_started' | 'dns_verified' | 'dns_lost' | 'provider_pending' | 'ssl_pending' | 'ssl_active' | 'activated' | 'deactivated' | 'removed' | 'failed'
  prev_status    text,
  new_status     text,
  actor_id       uuid references auth.users(id) on delete set null,
  ip             text,
  user_agent     text,
  error          text,
  metadata       jsonb not null default '{}'::jsonb,
  occurred_at    timestamptz not null default timezone('utc', now())
);

create index if not exists dvh_domain_idx on public.domain_verification_history (domain_id, occurred_at desc);
create index if not exists dvh_org_idx on public.domain_verification_history (organization_id, occurred_at desc);

alter table public.domain_verification_history enable row level security;
alter table public.domain_verification_history force row level security;

drop policy if exists "dvh_select" on public.domain_verification_history;
create policy "dvh_select"
on public.domain_verification_history for select to authenticated
using (
  (organization_id = public.current_user_organization_id()
   and public.current_user_role() in ('super_admin','admin'))
  or public.is_platform_admin()
);

-- ─── tenant_domains: estados expandidos + retry ─────────────
alter table public.tenant_domains
  add column if not exists next_check_at timestamptz,
  add column if not exists consecutive_failures smallint not null default 0,
  add column if not exists provider text,               -- 'vercel' | 'cloudflare' | ...
  add column if not exists provider_ref text;

-- Novo enum-like via check (não alteramos o enum antigo para não bloquear)
-- Valores possíveis agora: pending, awaiting_dns, verifying, dns_verified,
-- provider_pending, ssl_pending, ssl_active, verified, active, failed, disabled, error

-- ─── legal_documents ────────────────────────────────────────
create table if not exists public.legal_documents (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null,     -- 'terms' | 'privacy' | 'cookies' | 'trial_terms' | 'subscription_terms' | 'dpa'
  version        text not null,     -- '2026.01' | 'v1.0'
  language       text not null default 'pt-BR',
  title          text not null,
  content_hash   text not null,     -- sha256 do conteúdo publicado
  content_url    text,              -- pode ser rota interna ou storage path
  effective_at   timestamptz not null,
  published_at   timestamptz not null default timezone('utc', now()),
  is_current     boolean not null default true,
  unique (kind, version, language)
);

create index if not exists legal_docs_current_idx on public.legal_documents (kind, language) where is_current;

alter table public.legal_documents enable row level security;
alter table public.legal_documents force row level security;

drop policy if exists "legal_docs_public_select" on public.legal_documents;
create policy "legal_docs_public_select"
on public.legal_documents for select to authenticated using (true);

drop policy if exists "legal_docs_write_platform" on public.legal_documents;
create policy "legal_docs_write_platform"
on public.legal_documents for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- ─── legal_acceptances ──────────────────────────────────────
create table if not exists public.legal_acceptances (
  id                uuid primary key default gen_random_uuid(),
  document_id       uuid not null references public.legal_documents(id) on delete restrict,
  user_id           uuid not null references auth.users(id) on delete cascade,
  organization_id   uuid references public.organizations(id) on delete set null,
  accepted_at       timestamptz not null default timezone('utc', now()),
  ip                text,
  user_agent        text,
  unique (document_id, user_id)
);

create index if not exists legal_accept_user_idx on public.legal_acceptances (user_id, accepted_at desc);

alter table public.legal_acceptances enable row level security;
alter table public.legal_acceptances force row level security;

drop policy if exists "legal_accept_self" on public.legal_acceptances;
create policy "legal_accept_self"
on public.legal_acceptances for select to authenticated
using (user_id = auth.uid() or public.is_platform_admin());

drop policy if exists "legal_accept_insert" on public.legal_acceptances;
create policy "legal_accept_insert"
on public.legal_acceptances for insert to authenticated
with check (user_id = auth.uid());

-- ─── product_feedback ───────────────────────────────────────
create table if not exists public.product_feedback (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid references public.organizations(id) on delete cascade,
  user_id           uuid references auth.users(id) on delete set null,
  kind              text not null,   -- 'bug' | 'question' | 'suggestion' | 'friction' | 'performance'
  category          text,
  rating            smallint,        -- 1..5 opcional
  comment           text,
  route             text,
  screenshot_url    text,            -- storage path
  status            text not null default 'open',   -- 'open' | 'triaged' | 'resolved' | 'dismissed'
  linked_ticket_id  uuid references public.support_tickets(id) on delete set null,
  created_at        timestamptz not null default timezone('utc', now())
);

create index if not exists pf_org_idx on public.product_feedback (organization_id, created_at desc);
create index if not exists pf_status_idx on public.product_feedback (status, created_at desc);

alter table public.product_feedback enable row level security;
alter table public.product_feedback force row level security;

drop policy if exists "pf_own_select" on public.product_feedback;
create policy "pf_own_select"
on public.product_feedback for select to authenticated
using (
  user_id = auth.uid()
  or (organization_id = public.current_user_organization_id()
      and public.current_user_role() in ('super_admin','admin'))
  or public.is_platform_admin()
);

drop policy if exists "pf_insert_self" on public.product_feedback;
create policy "pf_insert_self"
on public.product_feedback for insert to authenticated
with check (user_id = auth.uid());

-- ─── product_analytics_events ───────────────────────────────
create table if not exists public.product_analytics_events (
  id                bigserial primary key,
  organization_id   uuid references public.organizations(id) on delete cascade,
  user_id           uuid references auth.users(id) on delete set null,
  event             text not null,
  properties        jsonb not null default '{}'::jsonb,
  session_id        text,
  occurred_at       timestamptz not null default timezone('utc', now())
);

create index if not exists pae_org_event_idx on public.product_analytics_events (organization_id, event, occurred_at desc);
create index if not exists pae_event_idx on public.product_analytics_events (event, occurred_at desc);

alter table public.product_analytics_events enable row level security;
alter table public.product_analytics_events force row level security;

drop policy if exists "pae_platform_select" on public.product_analytics_events;
create policy "pae_platform_select"
on public.product_analytics_events for select to authenticated
using (
  public.is_platform_admin()
  or (organization_id = public.current_user_organization_id()
      and public.current_user_role() in ('super_admin','admin'))
);

-- ─── incidents (status page pública) ────────────────────────
create table if not exists public.incidents (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  status         text not null default 'investigating',   -- 'investigating' | 'identified' | 'monitoring' | 'resolved'
  severity       text not null default 'minor',           -- 'minor' | 'major' | 'critical' | 'maintenance'
  affected       text[] not null default '{}',            -- ['app', 'billing', 'jobs', ...]
  started_at     timestamptz not null default timezone('utc', now()),
  resolved_at    timestamptz,
  created_by     uuid references auth.users(id) on delete set null
);

create index if not exists incidents_status_idx on public.incidents (status, started_at desc);

alter table public.incidents enable row level security;
alter table public.incidents force row level security;

drop policy if exists "incidents_public_select" on public.incidents;
create policy "incidents_public_select"
on public.incidents for select to authenticated using (true);

drop policy if exists "incidents_write_platform" on public.incidents;
create policy "incidents_write_platform"
on public.incidents for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create table if not exists public.incident_updates (
  id            uuid primary key default gen_random_uuid(),
  incident_id   uuid not null references public.incidents(id) on delete cascade,
  status        text not null,
  message       text not null,
  posted_by     uuid references auth.users(id) on delete set null,
  posted_at     timestamptz not null default timezone('utc', now())
);

create index if not exists iu_incident_idx on public.incident_updates (incident_id, posted_at desc);

alter table public.incident_updates enable row level security;
alter table public.incident_updates force row level security;

drop policy if exists "iu_public_select" on public.incident_updates;
create policy "iu_public_select"
on public.incident_updates for select to authenticated using (true);

drop policy if exists "iu_write_platform" on public.incident_updates;
create policy "iu_write_platform"
on public.incident_updates for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- ─── tenant_release_channels ────────────────────────────────
create table if not exists public.tenant_release_channels (
  organization_id  uuid primary key references public.organizations(id) on delete cascade,
  channel          text not null default 'production',   -- 'internal' | 'pilot' | 'beta' | 'production'
  notes            text,
  updated_at       timestamptz not null default timezone('utc', now())
);

alter table public.tenant_release_channels enable row level security;
alter table public.tenant_release_channels force row level security;

drop policy if exists "trc_select" on public.tenant_release_channels;
create policy "trc_select"
on public.tenant_release_channels for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  or public.is_platform_admin()
);

drop policy if exists "trc_write_platform" on public.tenant_release_channels;
create policy "trc_write_platform"
on public.tenant_release_channels for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- ─── support_tickets: SLA ───────────────────────────────────
alter table public.support_tickets
  add column if not exists sla_hours smallint,
  add column if not exists sla_due_at timestamptz,
  add column if not exists first_response_at timestamptz;

-- ─── security_events: novos tipos (não altera enum — event_type é text livre) ─
-- Nada a fazer (já é text).

-- ─── seed inicial de docs legais placeholder ────────────────
insert into public.legal_documents (kind, version, language, title, content_hash, effective_at)
values
  ('terms',    'v1.0', 'pt-BR', 'Termos de Uso',        'placeholder-hash', timezone('utc', now())),
  ('privacy',  'v1.0', 'pt-BR', 'Política de Privacidade', 'placeholder-hash', timezone('utc', now())),
  ('cookies',  'v1.0', 'pt-BR', 'Política de Cookies',  'placeholder-hash', timezone('utc', now()))
on conflict (kind, version, language) do nothing;

-- ─── Novo job kind: domain_revalidate + analytics_flush ─────
do $$ begin
  alter type public.job_kind add value if not exists 'domain_revalidate';
exception when others then null; end $$;


-- =============================================================
-- 0042_phase9_activation.sql
-- =============================================================

-- =============================================================
-- 0042 · Fase 9 · Produção real, integrações concretas, homologação
--
-- Adições sobre Fase 8:
--   • data_imports + data_import_rows — importador CSV completo
--   • tenant_provisioning_runs — trilha do provisionamento do 1º tenant
--   • external_configuration_checks — histórico de checks das integrações
--   • app_session_revocation_cache — cache eficiente para revogação
--   • billing_reconciliation_runs — histórico de reconciliação Stripe
--   • device_recognition — devices conhecidos por usuário (alerta novo login)
--   • uat_runs + uat_results — trilha das homologações UAT
--   • novos job_kind: csv_import, billing_reconcile, device_alert
-- =============================================================

-- ─── novos job kinds ────────────────────────────────────────
do $$ begin
  alter type public.job_kind add value if not exists 'csv_import';
exception when others then null; end $$;
do $$ begin
  alter type public.job_kind add value if not exists 'billing_reconcile';
exception when others then null; end $$;
do $$ begin
  alter type public.job_kind add value if not exists 'device_alert';
exception when others then null; end $$;

-- ─── data_imports ───────────────────────────────────────────
create table if not exists public.data_imports (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  entity            text not null,           -- 'clinics' | 'dentists' | 'patients' | 'cases'
  status            text not null default 'draft',  -- 'draft'|'validating'|'ready'|'processing'|'completed'|'failed'|'cancelled'
  storage_path      text,                    -- CSV file location in private bucket
  file_size         int,
  row_count         int,
  header_mapping    jsonb not null default '{}'::jsonb,
  dry_run           boolean not null default true,
  idempotency_key   text,
  rows_ok           int not null default 0,
  rows_error        int not null default 0,
  rows_duplicate    int not null default 0,
  report_url        text,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default timezone('utc', now()),
  started_at        timestamptz,
  completed_at      timestamptz,
  error             text
);

create index if not exists di_org_idx on public.data_imports (organization_id, created_at desc);
create index if not exists di_status_idx on public.data_imports (status);

alter table public.data_imports enable row level security;
alter table public.data_imports force row level security;

drop policy if exists "di_select" on public.data_imports;
create policy "di_select"
on public.data_imports for select to authenticated
using (
  (organization_id = public.current_user_organization_id()
   and public.current_user_role() in ('super_admin','admin','commercial'))
  or public.is_platform_admin()
);

drop policy if exists "di_write" on public.data_imports;
create policy "di_write"
on public.data_imports for all to authenticated
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

-- ─── data_import_rows ───────────────────────────────────────
create table if not exists public.data_import_rows (
  id                uuid primary key default gen_random_uuid(),
  import_id         uuid not null references public.data_imports(id) on delete cascade,
  row_number        int not null,
  status            text not null,         -- 'ok'|'error'|'duplicate'|'skipped'
  raw               jsonb not null,
  parsed            jsonb,
  errors            jsonb not null default '[]'::jsonb,
  created_entity_id uuid,
  created_at        timestamptz not null default timezone('utc', now())
);

create index if not exists dir_import_idx on public.data_import_rows (import_id, row_number);
create index if not exists dir_status_idx on public.data_import_rows (import_id, status);

alter table public.data_import_rows enable row level security;
alter table public.data_import_rows force row level security;

drop policy if exists "dir_select" on public.data_import_rows;
create policy "dir_select"
on public.data_import_rows for select to authenticated
using (
  exists (
    select 1 from public.data_imports di
    where di.id = data_import_rows.import_id
      and ((di.organization_id = public.current_user_organization_id()
            and public.current_user_role() in ('super_admin','admin','commercial'))
           or public.is_platform_admin())
  )
);

-- ─── tenant_provisioning_runs ───────────────────────────────
create table if not exists public.tenant_provisioning_runs (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid references public.organizations(id) on delete cascade,
  operator_id       uuid references auth.users(id) on delete set null,
  status            text not null default 'started',   -- 'started'|'succeeded'|'failed'|'cancelled'
  steps             jsonb not null default '[]'::jsonb,  -- [{name, status, at, error?}]
  input             jsonb not null default '{}'::jsonb,
  result            jsonb,
  error             text,
  started_at        timestamptz not null default timezone('utc', now()),
  completed_at      timestamptz
);

create index if not exists tpr_org_idx on public.tenant_provisioning_runs (organization_id, started_at desc);

alter table public.tenant_provisioning_runs enable row level security;
alter table public.tenant_provisioning_runs force row level security;

drop policy if exists "tpr_platform" on public.tenant_provisioning_runs;
create policy "tpr_platform"
on public.tenant_provisioning_runs for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- ─── external_configuration_checks ──────────────────────────
create table if not exists public.external_configuration_checks (
  id             uuid primary key default gen_random_uuid(),
  component      text not null,      -- 'stripe'|'email'|'sentry'|'redis'|'turnstile'|'vercel_domains'|'cron'|'supabase_backups'
  status         text not null,      -- 'ok'|'warning'|'error'|'unconfigured'|'unknown'
  detail         text,
  metadata       jsonb not null default '{}'::jsonb,
  checked_by     uuid references auth.users(id) on delete set null,
  checked_at     timestamptz not null default timezone('utc', now())
);

create index if not exists ecc_component_idx on public.external_configuration_checks (component, checked_at desc);

alter table public.external_configuration_checks enable row level security;
alter table public.external_configuration_checks force row level security;

drop policy if exists "ecc_platform" on public.external_configuration_checks;
create policy "ecc_platform"
on public.external_configuration_checks for select to authenticated
using (public.is_platform_admin());

-- ─── app_session_revocation_cache ───────────────────────────
-- Cache curto para checks de revogação sem hitar app_sessions em toda request.
-- Chaves são hashes de session; TTL controlado no worker.
create table if not exists public.app_session_revocation_cache (
  session_hash    text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  revoked_at      timestamptz not null default timezone('utc', now()),
  expires_at      timestamptz not null default (timezone('utc', now()) + interval '24 hours')
);

create index if not exists asrc_expires_idx on public.app_session_revocation_cache (expires_at);

alter table public.app_session_revocation_cache enable row level security;
alter table public.app_session_revocation_cache force row level security;
-- No policies for authenticated — only service role writes/reads.

-- ─── billing_reconciliation_runs ────────────────────────────
create table if not exists public.billing_reconciliation_runs (
  id                uuid primary key default gen_random_uuid(),
  scope             text not null default 'all',   -- 'all' | 'org'
  organization_id   uuid references public.organizations(id) on delete set null,
  status            text not null default 'running',   -- 'running'|'success'|'failed'
  compared_count    int not null default 0,
  divergences_count int not null default 0,
  auto_fixed_count  int not null default 0,
  alerts_count      int not null default 0,
  report            jsonb,
  started_at        timestamptz not null default timezone('utc', now()),
  completed_at      timestamptz,
  error             text
);

create index if not exists brr_started_idx on public.billing_reconciliation_runs (started_at desc);

alter table public.billing_reconciliation_runs enable row level security;
alter table public.billing_reconciliation_runs force row level security;

drop policy if exists "brr_platform" on public.billing_reconciliation_runs;
create policy "brr_platform"
on public.billing_reconciliation_runs for select to authenticated
using (public.is_platform_admin());

-- ─── device_recognition ─────────────────────────────────────
-- Dispositivos conhecidos por usuário (fingerprint leve).
-- Novo dispositivo → dispara alerta.
create table if not exists public.device_recognition (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  device_key     text not null,     -- sha256(ua_family + os + ip_class + salt)
  first_seen_at  timestamptz not null default timezone('utc', now()),
  last_seen_at   timestamptz not null default timezone('utc', now()),
  login_count    int not null default 1,
  labeled        text,              -- opcional: "MacBook Pessoal"
  unique (user_id, device_key)
);

create index if not exists dr_user_idx on public.device_recognition (user_id, last_seen_at desc);

alter table public.device_recognition enable row level security;
alter table public.device_recognition force row level security;

drop policy if exists "dr_self_select" on public.device_recognition;
create policy "dr_self_select"
on public.device_recognition for select to authenticated
using (user_id = auth.uid() or public.is_platform_admin());

-- ─── uat_runs + uat_results ─────────────────────────────────
create table if not exists public.uat_runs (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid references public.organizations(id) on delete cascade,
  profile           text not null,      -- 'owner'|'admin'|'operator'|'finance'|'dentist'
  operator_id       uuid references auth.users(id) on delete set null,
  status            text not null default 'in_progress',  -- 'in_progress'|'approved'|'rejected'
  notes             text,
  started_at        timestamptz not null default timezone('utc', now()),
  completed_at      timestamptz
);

create index if not exists uat_runs_org_idx on public.uat_runs (organization_id, started_at desc);

alter table public.uat_runs enable row level security;
alter table public.uat_runs force row level security;

drop policy if exists "uat_runs_select" on public.uat_runs;
create policy "uat_runs_select"
on public.uat_runs for select to authenticated
using (
  (organization_id = public.current_user_organization_id()
   and public.current_user_role() in ('super_admin','admin'))
  or public.is_platform_admin()
);

create table if not exists public.uat_results (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid not null references public.uat_runs(id) on delete cascade,
  scenario_key   text not null,
  status         text not null,      -- 'passed'|'failed'|'skipped'
  observation    text,
  evidence_url   text,
  captured_at    timestamptz not null default timezone('utc', now()),
  unique (run_id, scenario_key)
);

create index if not exists uat_results_run_idx on public.uat_results (run_id);

alter table public.uat_results enable row level security;
alter table public.uat_results force row level security;

drop policy if exists "uat_results_select" on public.uat_results;
create policy "uat_results_select"
on public.uat_results for select to authenticated
using (
  exists (select 1 from public.uat_runs r where r.id = uat_results.run_id and (
    (r.organization_id = public.current_user_organization_id()
     and public.current_user_role() in ('super_admin','admin'))
    or public.is_platform_admin()
  ))
);

-- ─── data-imports bucket ────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('data-imports', 'data-imports', false)
on conflict (id) do nothing;

drop policy if exists "data_imports_bucket_write_admin" on storage.objects;
create policy "data_imports_bucket_write_admin"
on storage.objects for all to authenticated
using (
  bucket_id = 'data-imports'
  and public.storage_path_org(name) = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin')
)
with check (
  bucket_id = 'data-imports'
  and public.storage_path_org(name) = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin')
);

-- ─── Helper RPC: check session revoked (fast) ───────────────
create or replace function public.is_session_revoked(p_session_hash text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_session_revocation_cache
    where session_hash = p_session_hash
      and expires_at > timezone('utc', now())
  ) or exists (
    select 1 from public.app_sessions
    where session_hash = p_session_hash
      and revoked_at is not null
  );
$$;

grant execute on function public.is_session_revoked(text) to authenticated;

