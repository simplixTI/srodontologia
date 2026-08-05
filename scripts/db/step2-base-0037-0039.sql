-- =============================================================
-- STEP 2 · 0037 + 0038 + 0039
--
-- Cria enums (job_status, job_kind, subscription_status, etc.)
-- e as tabelas base. Rodar como uma submissão no SQL Editor.
--
-- Pré-requisito: STEP 1 executado.
-- =============================================================


-- =============================================================
-- 0037_portal_dentist_safety.sql
-- =============================================================

-- =============================================================
-- 0037 · Portal do Dentista · safety + read tracking
--
-- 1. Sanitize quotes read-side for dentists: create a view
--    that excludes internal_notes + shipping_cost from what
--    a dentist can ever see. RLS on the base table stays strict.
-- 2. Add case_message_reads (per-user read tracking).
-- 3. Add safe view for dentist-facing quotes.
-- =============================================================

-- ─── case_message_reads ─────────────────────────────────────
create table if not exists public.case_message_reads (
  message_id   uuid not null references public.case_messages(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  read_at      timestamptz not null default timezone('utc', now()),
  primary key (message_id, user_id)
);

create index if not exists case_message_reads_user_idx
  on public.case_message_reads (user_id, read_at desc);

alter table public.case_message_reads enable row level security;
alter table public.case_message_reads force row level security;

drop policy if exists "case_message_reads_select_own" on public.case_message_reads;
drop policy if exists "case_message_reads_insert_own" on public.case_message_reads;

create policy "case_message_reads_select_own"
on public.case_message_reads for select to authenticated
using (user_id = auth.uid());

create policy "case_message_reads_insert_own"
on public.case_message_reads for insert to authenticated
with check (user_id = auth.uid());

-- ─── quotes_public: sanitized view for external users ───────
-- Excludes internal_notes. Column list is explicit for safety.
create or replace view public.quotes_public
with (security_invoker = true)
as
select
  q.id,
  q.organization_id,
  q.case_id,
  q.quote_number,
  q.version_number,
  q.status,
  q.subtotal,
  q.discount,
  q.shipping_cost,
  q.total,
  q.payment_terms,
  q.validity_date,
  q.estimated_days,
  q.public_notes,
  q.sent_at,
  q.approved_at,
  q.rejected_at,
  q.created_at,
  q.updated_at
from public.quotes q;

grant select on public.quotes_public to authenticated;

-- Helper function: dentist approval of a quote with audit trail.
-- SECURITY DEFINER so we can insert the audit row + update the quote
-- in one transaction and capture IP/UA passed in from the client.
create or replace function public.dentist_approve_quote(
  p_quote_id   uuid,
  p_ip         text,
  p_user_agent text,
  p_comment    text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case    record;
  v_quote   record;
  v_uid     uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Unauthenticated'; end if;

  select id, organization_id, case_id, status
    into v_quote
    from public.quotes
    where id = p_quote_id;

  if not found then raise exception 'Quote not found'; end if;

  -- Ensure caller is the dentist owner of this case
  select c.id, c.dentist_id, d.profile_id
    into v_case
    from public.cases c
    join public.dentists d on d.id = c.dentist_id
    where c.id = v_quote.case_id;

  if not found or v_case.profile_id <> v_uid then
    raise exception 'Forbidden';
  end if;

  if v_quote.status not in ('sent', 'changes_requested') then
    raise exception 'Quote cannot be approved in status %', v_quote.status;
  end if;

  update public.quotes
    set status = 'approved',
        approved_at = timezone('utc', now())
    where id = p_quote_id;

  insert into public.quote_actions (
    organization_id, quote_id, action, comment,
    performed_by, ip_address, user_agent
  ) values (
    v_quote.organization_id, p_quote_id, 'approved_by_dentist', p_comment,
    v_uid,
    case when p_ip is null or p_ip = '' then null else p_ip::inet end,
    p_user_agent
  );
end;
$$;

grant execute on function public.dentist_approve_quote(uuid, text, text, text) to authenticated;

-- Dentist request changes on quote (moves to 'changes_requested')
create or replace function public.dentist_request_quote_changes(
  p_quote_id   uuid,
  p_ip         text,
  p_user_agent text,
  p_comment    text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case    record;
  v_quote   record;
  v_uid     uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Unauthenticated'; end if;
  if p_comment is null or length(trim(p_comment)) < 3 then
    raise exception 'Comment required';
  end if;

  select id, organization_id, case_id, status
    into v_quote
    from public.quotes
    where id = p_quote_id;
  if not found then raise exception 'Quote not found'; end if;

  select c.id, d.profile_id
    into v_case
    from public.cases c
    join public.dentists d on d.id = c.dentist_id
    where c.id = v_quote.case_id;
  if not found or v_case.profile_id <> v_uid then raise exception 'Forbidden'; end if;

  if v_quote.status <> 'sent' then
    raise exception 'Cannot request changes in status %', v_quote.status;
  end if;

  update public.quotes set status = 'changes_requested' where id = p_quote_id;

  insert into public.quote_actions (
    organization_id, quote_id, action, comment,
    performed_by, ip_address, user_agent
  ) values (
    v_quote.organization_id, p_quote_id, 'changes_requested_by_dentist', p_comment,
    v_uid,
    case when p_ip is null or p_ip = '' then null else p_ip::inet end,
    p_user_agent
  );
end;
$$;

grant execute on function public.dentist_request_quote_changes(uuid, text, text, text) to authenticated;

-- Dentist approve planning
create or replace function public.dentist_approve_planning(
  p_planning_id uuid,
  p_ip          text,
  p_user_agent  text,
  p_comment     text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan  record;
  v_case  record;
  v_uid   uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Unauthenticated'; end if;

  select id, organization_id, case_id, status
    into v_plan
    from public.planning_versions
    where id = p_planning_id;
  if not found then raise exception 'Planning not found'; end if;

  select d.profile_id
    into v_case
    from public.cases c
    join public.dentists d on d.id = c.dentist_id
    where c.id = v_plan.case_id;
  if not found or v_case.profile_id <> v_uid then raise exception 'Forbidden'; end if;

  if v_plan.status not in ('sent', 'changes_requested') then
    raise exception 'Planning cannot be approved in status %', v_plan.status;
  end if;

  update public.planning_versions
    set status = 'approved',
        approved_at = timezone('utc', now())
    where id = p_planning_id;

  insert into public.planning_actions (
    organization_id, planning_version_id, action, comment,
    performed_by, ip_address, user_agent
  ) values (
    v_plan.organization_id, p_planning_id, 'approved_by_dentist', p_comment,
    v_uid,
    case when p_ip is null or p_ip = '' then null else p_ip::inet end,
    p_user_agent
  );
end;
$$;

grant execute on function public.dentist_approve_planning(uuid, text, text, text) to authenticated;

-- Dentist request changes on planning
create or replace function public.dentist_request_planning_changes(
  p_planning_id uuid,
  p_ip          text,
  p_user_agent  text,
  p_comment     text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan  record;
  v_case  record;
  v_uid   uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Unauthenticated'; end if;
  if p_comment is null or length(trim(p_comment)) < 3 then
    raise exception 'Comment required';
  end if;

  select id, organization_id, case_id, status
    into v_plan
    from public.planning_versions
    where id = p_planning_id;
  if not found then raise exception 'Planning not found'; end if;

  select d.profile_id
    into v_case
    from public.cases c
    join public.dentists d on d.id = c.dentist_id
    where c.id = v_plan.case_id;
  if not found or v_case.profile_id <> v_uid then raise exception 'Forbidden'; end if;

  if v_plan.status <> 'sent' then
    raise exception 'Cannot request changes in status %', v_plan.status;
  end if;

  update public.planning_versions set status = 'changes_requested' where id = p_planning_id;

  insert into public.planning_actions (
    organization_id, planning_version_id, action, comment,
    performed_by, ip_address, user_agent
  ) values (
    v_plan.organization_id, p_planning_id, 'changes_requested_by_dentist', p_comment,
    v_uid,
    case when p_ip is null or p_ip = '' then null else p_ip::inet end,
    p_user_agent
  );
end;
$$;

grant execute on function public.dentist_request_planning_changes(uuid, text, text, text) to authenticated;

-- Dentist confirm delivery receipt
create or replace function public.dentist_confirm_delivery(
  p_delivery_id uuid,
  p_ip          text,
  p_user_agent  text,
  p_notes       text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_del  record;
  v_case record;
  v_uid  uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Unauthenticated'; end if;

  select id, organization_id, case_id, status
    into v_del
    from public.deliveries
    where id = p_delivery_id;
  if not found then raise exception 'Delivery not found'; end if;

  select d.profile_id, d.full_name
    into v_case
    from public.cases c
    join public.dentists d on d.id = c.dentist_id
    where c.id = v_del.case_id;
  if not found or v_case.profile_id <> v_uid then raise exception 'Forbidden'; end if;

  if v_del.status not in ('dispatched', 'in_transit') then
    raise exception 'Delivery cannot be confirmed in status %', v_del.status;
  end if;

  update public.deliveries
    set status = 'delivered',
        delivered_at = timezone('utc', now()),
        recipient_name = coalesce(recipient_name, v_case.full_name),
        confirmation_data = confirmation_data || jsonb_build_object(
          'confirmed_by', v_uid::text,
          'confirmed_at', timezone('utc', now())::text,
          'ip', coalesce(p_ip, ''),
          'user_agent', coalesce(p_user_agent, ''),
          'notes', coalesce(p_notes, '')
        )
    where id = p_delivery_id;
end;
$$;

grant execute on function public.dentist_confirm_delivery(uuid, text, text, text) to authenticated;


-- =============================================================
-- 0038_phase5_ai_foundation.sql
-- =============================================================

-- =============================================================
-- 0038 · Fase 5 · Fundação de IA, automação e integrações
--
-- Cria a infra base (backend) que suporta:
--   • Job Queue assíncrona (OCR, IA, PDF, webhooks, notificações batch)
--   • Event Bus persistente (domain_events)
--   • Configuração de providers de IA por organização
--   • Configuração de integrações externas (WhatsApp, Email, CPF, OCR)
--   • Central de automações (regras baseadas em eventos)
--   • Webhooks públicos assinados
--   • Índice de busca inteligente (tsvector, prep vetorização futura)
--   • Cache de resumos IA por caso
--   • Uso de IA (tokens, custo, rate limit por org)
--
-- Todas as tabelas: multi-tenant (organization_id), RLS strict,
-- policies baseadas em is_internal_user()/is_admin() já existentes.
-- =============================================================

-- ─── enums ──────────────────────────────────────────────────
do $$ begin
  create type public.job_status as enum (
    'queued', 'running', 'completed', 'failed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.job_kind as enum (
    'ocr_document',
    'ai_case_summary',
    'ai_image_analysis',
    'ai_lab_assistant',
    'ai_dentist_assistant',
    'ai_prazo_prediction',
    'pdf_generate_quote',
    'pdf_generate_planning',
    'pdf_generate_receipt',
    'pdf_generate_case_report',
    'webhook_deliver',
    'email_send',
    'whatsapp_send',
    'search_reindex',
    'automation_run'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.integration_kind as enum (
    'ai_provider',
    'ocr_provider',
    'cpf_provider',
    'whatsapp',
    'email',
    'webhook'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.webhook_delivery_status as enum (
    'pending', 'delivered', 'failed', 'exhausted'
  );
exception when duplicate_object then null; end $$;

-- ─── jobs ────────────────────────────────────────────────────
create table if not exists public.jobs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  kind             public.job_kind not null,
  status           public.job_status not null default 'queued',
  priority         smallint not null default 5,      -- 1 = highest
  payload          jsonb not null default '{}'::jsonb,
  result           jsonb,
  error            text,
  attempts         smallint not null default 0,
  max_attempts     smallint not null default 3,
  run_after        timestamptz not null default timezone('utc', now()),
  locked_at        timestamptz,
  locked_by        text,                              -- worker id
  started_at       timestamptz,
  completed_at     timestamptz,
  created_by       uuid references auth.users(id) on delete set null,
  case_id          uuid references public.cases(id) on delete set null,
  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now())
);

create index if not exists jobs_ready_idx
  on public.jobs (status, run_after, priority)
  where status = 'queued';

create index if not exists jobs_org_status_idx on public.jobs (organization_id, status, created_at desc);
create index if not exists jobs_case_idx on public.jobs (case_id) where case_id is not null;

drop trigger if exists set_updated_at_jobs on public.jobs;
create trigger set_updated_at_jobs before update on public.jobs
  for each row execute function public.set_updated_at();

alter table public.jobs enable row level security;
alter table public.jobs force row level security;

drop policy if exists "jobs_select_internal" on public.jobs;
create policy "jobs_select_internal"
on public.jobs for select to authenticated
using (organization_id = public.current_user_organization_id() and public.is_internal_user());

drop policy if exists "jobs_insert_internal" on public.jobs;
create policy "jobs_insert_internal"
on public.jobs for insert to authenticated
with check (organization_id = public.current_user_organization_id() and public.is_internal_user());

-- worker updates via service_role (bypass); no update/delete policy for authenticated.

-- ─── domain_events (Event Bus persistente) ──────────────────
create table if not exists public.domain_events (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  event_type        text not null,        -- e.g. 'case.created', 'quote.approved'
  aggregate_type    text not null,        -- 'case', 'quote', 'planning', ...
  aggregate_id      uuid not null,
  payload           jsonb not null default '{}'::jsonb,
  actor_id          uuid references auth.users(id) on delete set null,
  processed_at      timestamptz,
  occurred_at       timestamptz not null default timezone('utc', now())
);

create index if not exists domain_events_org_type_idx
  on public.domain_events (organization_id, event_type, occurred_at desc);
create index if not exists domain_events_unprocessed_idx
  on public.domain_events (occurred_at)
  where processed_at is null;
create index if not exists domain_events_aggregate_idx
  on public.domain_events (aggregate_type, aggregate_id, occurred_at desc);

alter table public.domain_events enable row level security;
alter table public.domain_events force row level security;

drop policy if exists "domain_events_select_internal" on public.domain_events;
create policy "domain_events_select_internal"
on public.domain_events for select to authenticated
using (organization_id = public.current_user_organization_id() and public.is_internal_user());

drop policy if exists "domain_events_insert_internal" on public.domain_events;
create policy "domain_events_insert_internal"
on public.domain_events for insert to authenticated
with check (organization_id = public.current_user_organization_id() and public.is_internal_user());

-- ─── ai_settings (config por organização) ───────────────────
create table if not exists public.ai_settings (
  organization_id  uuid primary key references public.organizations(id) on delete cascade,
  provider         text not null default 'mock',        -- mock | openai | anthropic | google | openrouter
  model            text not null default 'mock-1',
  temperature      numeric(3,2) not null default 0.3,
  max_tokens       int not null default 1024,
  system_prompt    text,
  features         jsonb not null default '{
    "case_summary": true,
    "lab_assistant": true,
    "dentist_assistant": true,
    "image_analysis": false,
    "prazo_prediction": true,
    "smart_search": true
  }'::jsonb,
  monthly_token_budget int not null default 1000000,
  updated_at       timestamptz not null default timezone('utc', now()),
  updated_by       uuid references auth.users(id) on delete set null
);

drop trigger if exists set_updated_at_ai_settings on public.ai_settings;
create trigger set_updated_at_ai_settings before update on public.ai_settings
  for each row execute function public.set_updated_at();

alter table public.ai_settings enable row level security;
alter table public.ai_settings force row level security;

drop policy if exists "ai_settings_select_internal" on public.ai_settings;
create policy "ai_settings_select_internal"
on public.ai_settings for select to authenticated
using (organization_id = public.current_user_organization_id() and public.is_internal_user());

drop policy if exists "ai_settings_upsert_admin" on public.ai_settings;
create policy "ai_settings_upsert_admin"
on public.ai_settings for all to authenticated
using (organization_id = public.current_user_organization_id() and public.current_user_role() in ('super_admin','admin'))
with check (organization_id = public.current_user_organization_id() and public.current_user_role() in ('super_admin','admin'));

-- ─── integration_settings (WhatsApp, Email, CPF, OCR, etc) ──
create table if not exists public.integration_settings (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  kind             public.integration_kind not null,
  provider         text not null,        -- 'twilio' | 'z-api' | 'resend' | 'sendgrid' | 'cpfapi' | ...
  enabled          boolean not null default false,
  config           jsonb not null default '{}'::jsonb,   -- non-secret config
  secret_ref       text,                 -- env var name that holds the actual secret
  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now()),
  updated_by       uuid references auth.users(id) on delete set null,
  unique (organization_id, kind)
);

drop trigger if exists set_updated_at_integration_settings on public.integration_settings;
create trigger set_updated_at_integration_settings before update on public.integration_settings
  for each row execute function public.set_updated_at();

alter table public.integration_settings enable row level security;
alter table public.integration_settings force row level security;

drop policy if exists "integration_settings_select_internal" on public.integration_settings;
create policy "integration_settings_select_internal"
on public.integration_settings for select to authenticated
using (organization_id = public.current_user_organization_id() and public.is_internal_user());

drop policy if exists "integration_settings_write_admin" on public.integration_settings;
create policy "integration_settings_write_admin"
on public.integration_settings for all to authenticated
using (organization_id = public.current_user_organization_id() and public.current_user_role() in ('super_admin','admin'))
with check (organization_id = public.current_user_organization_id() and public.current_user_role() in ('super_admin','admin'));

-- ─── automation_rules (Central de Automações) ───────────────
create table if not exists public.automation_rules (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  description      text,
  trigger_event    text not null,        -- e.g. 'quote.approved'
  conditions       jsonb not null default '[]'::jsonb, -- [{field, op, value}]
  actions          jsonb not null default '[]'::jsonb, -- [{type, params}]
  enabled          boolean not null default true,
  priority         smallint not null default 5,
  runs_count       int not null default 0,
  last_run_at      timestamptz,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now())
);

create index if not exists automation_rules_org_event_idx
  on public.automation_rules (organization_id, trigger_event)
  where enabled;

drop trigger if exists set_updated_at_automation_rules on public.automation_rules;
create trigger set_updated_at_automation_rules before update on public.automation_rules
  for each row execute function public.set_updated_at();

alter table public.automation_rules enable row level security;
alter table public.automation_rules force row level security;

drop policy if exists "automation_rules_select_internal" on public.automation_rules;
create policy "automation_rules_select_internal"
on public.automation_rules for select to authenticated
using (organization_id = public.current_user_organization_id() and public.is_internal_user());

drop policy if exists "automation_rules_write_admin" on public.automation_rules;
create policy "automation_rules_write_admin"
on public.automation_rules for all to authenticated
using (organization_id = public.current_user_organization_id() and public.current_user_role() in ('super_admin','admin'))
with check (organization_id = public.current_user_organization_id() and public.current_user_role() in ('super_admin','admin'));

-- ─── webhooks (externos, assinados) ─────────────────────────
create table if not exists public.webhooks (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  url              text not null,
  secret           text not null,        -- HMAC signing secret (opaque)
  events           text[] not null default '{}'::text[],
  enabled          boolean not null default true,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_updated_at_webhooks on public.webhooks;
create trigger set_updated_at_webhooks before update on public.webhooks
  for each row execute function public.set_updated_at();

alter table public.webhooks enable row level security;
alter table public.webhooks force row level security;

drop policy if exists "webhooks_select_internal" on public.webhooks;
create policy "webhooks_select_internal"
on public.webhooks for select to authenticated
using (organization_id = public.current_user_organization_id() and public.is_internal_user());

drop policy if exists "webhooks_write_admin" on public.webhooks;
create policy "webhooks_write_admin"
on public.webhooks for all to authenticated
using (organization_id = public.current_user_organization_id() and public.current_user_role() in ('super_admin','admin'))
with check (organization_id = public.current_user_organization_id() and public.current_user_role() in ('super_admin','admin'));

-- ─── webhook_deliveries (log de tentativas) ─────────────────
create table if not exists public.webhook_deliveries (
  id               uuid primary key default gen_random_uuid(),
  webhook_id       uuid not null references public.webhooks(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  event_id         uuid references public.domain_events(id) on delete set null,
  event_type       text not null,
  status           public.webhook_delivery_status not null default 'pending',
  request_body     jsonb not null,
  response_status  int,
  response_body    text,
  attempts         smallint not null default 0,
  next_retry_at    timestamptz,
  delivered_at     timestamptz,
  created_at       timestamptz not null default timezone('utc', now())
);

create index if not exists webhook_deliveries_pending_idx
  on public.webhook_deliveries (next_retry_at)
  where status = 'pending';
create index if not exists webhook_deliveries_org_idx
  on public.webhook_deliveries (organization_id, created_at desc);

alter table public.webhook_deliveries enable row level security;
alter table public.webhook_deliveries force row level security;

drop policy if exists "webhook_deliveries_select_admin" on public.webhook_deliveries;
create policy "webhook_deliveries_select_admin"
on public.webhook_deliveries for select to authenticated
using (organization_id = public.current_user_organization_id() and public.current_user_role() in ('super_admin','admin'));

-- ─── search_index (busca inteligente com tsvector) ──────────
create table if not exists public.search_index (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  entity_type      text not null,        -- 'case' | 'patient' | 'dentist' | 'clinic' | 'message' | 'file'
  entity_id        uuid not null,
  title            text,
  content          text not null default '',
  tokens           tsvector,
  metadata         jsonb not null default '{}'::jsonb,
  updated_at       timestamptz not null default timezone('utc', now()),
  unique (entity_type, entity_id)
);

create index if not exists search_index_tokens_idx on public.search_index using gin (tokens);
create index if not exists search_index_org_type_idx on public.search_index (organization_id, entity_type);

-- Trigger to auto-generate tsvector on insert/update
create or replace function public.search_index_update_tokens()
returns trigger language plpgsql as $$
begin
  new.tokens := to_tsvector('portuguese',
    coalesce(new.title, '') || ' ' || coalesce(new.content, ''));
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists search_index_tokens_trigger on public.search_index;
create trigger search_index_tokens_trigger
  before insert or update on public.search_index
  for each row execute function public.search_index_update_tokens();

alter table public.search_index enable row level security;
alter table public.search_index force row level security;

drop policy if exists "search_index_select_internal" on public.search_index;
create policy "search_index_select_internal"
on public.search_index for select to authenticated
using (organization_id = public.current_user_organization_id() and public.is_internal_user());

-- writes only via service_role.

-- ─── case_ai_summaries (cache de resumo IA) ─────────────────
create table if not exists public.case_ai_summaries (
  case_id          uuid primary key references public.cases(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  summary          text not null,
  pending          text[],               -- pendências detectadas
  next_steps       text[],               -- próximos passos sugeridos
  source_hash      text not null,        -- hash do estado do caso quando gerado
  model            text,
  generated_at     timestamptz not null default timezone('utc', now())
);

create index if not exists case_ai_summaries_org_idx on public.case_ai_summaries (organization_id, generated_at desc);

alter table public.case_ai_summaries enable row level security;
alter table public.case_ai_summaries force row level security;

drop policy if exists "case_ai_summaries_select_internal" on public.case_ai_summaries;
create policy "case_ai_summaries_select_internal"
on public.case_ai_summaries for select to authenticated
using (organization_id = public.current_user_organization_id() and public.is_internal_user());

drop policy if exists "case_ai_summaries_select_dentist" on public.case_ai_summaries;
create policy "case_ai_summaries_select_dentist"
on public.case_ai_summaries for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() = 'dentist'
  and exists (
    select 1 from public.cases c
    join public.dentists d on d.id = c.dentist_id
    where c.id = case_ai_summaries.case_id and d.profile_id = auth.uid()
  )
);

-- ─── ai_usage_log ───────────────────────────────────────────
create table if not exists public.ai_usage_log (
  id               bigserial primary key,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  provider         text not null,
  model            text not null,
  feature          text not null,        -- 'case_summary' | 'lab_assistant' | ...
  input_tokens     int not null default 0,
  output_tokens    int not null default 0,
  latency_ms       int,
  case_id          uuid references public.cases(id) on delete set null,
  user_id          uuid references auth.users(id) on delete set null,
  cost_estimate    numeric(10,6),
  created_at       timestamptz not null default timezone('utc', now())
);

create index if not exists ai_usage_log_org_idx on public.ai_usage_log (organization_id, created_at desc);

alter table public.ai_usage_log enable row level security;
alter table public.ai_usage_log force row level security;

drop policy if exists "ai_usage_log_select_admin" on public.ai_usage_log;
create policy "ai_usage_log_select_admin"
on public.ai_usage_log for select to authenticated
using (organization_id = public.current_user_organization_id() and public.current_user_role() in ('super_admin','admin'));

-- ─── cpf_lookup_cache (evita chamadas repetidas) ────────────
create table if not exists public.cpf_lookup_cache (
  cpf_hash         text primary key,     -- sha256(cpf) — nunca guardar CPF em claro
  full_name        text,
  birth_date       date,
  gender           text,
  mother_name      text,
  status           text not null,        -- 'ok' | 'not_found' | 'invalid' | 'error'
  provider         text not null,
  cached_at        timestamptz not null default timezone('utc', now()),
  expires_at       timestamptz not null default (timezone('utc', now()) + interval '30 days')
);

create index if not exists cpf_lookup_cache_expires_idx on public.cpf_lookup_cache (expires_at);

-- Não RLS (dado não-identificável isoladamente + escrita só service_role).
-- Explicitly deny select to authenticated for extra safety.
alter table public.cpf_lookup_cache enable row level security;
alter table public.cpf_lookup_cache force row level security;
-- No policies = deny by default.

-- ─── domain_events emitter helper ───────────────────────────
-- Convenience RPC to emit an event from other triggers/functions.
create or replace function public.emit_domain_event(
  p_org_id         uuid,
  p_event_type     text,
  p_aggregate_type text,
  p_aggregate_id   uuid,
  p_payload        jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.domain_events (
    organization_id, event_type, aggregate_type, aggregate_id, payload, actor_id
  )
  values (
    p_org_id, p_event_type, p_aggregate_type, p_aggregate_id, coalesce(p_payload, '{}'::jsonb), auth.uid()
  )
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.emit_domain_event(uuid, text, text, uuid, jsonb) to authenticated;

-- ─── Job enqueue helper (chamada de qualquer server action) ─
create or replace function public.enqueue_job(
  p_kind         public.job_kind,
  p_payload      jsonb default '{}'::jsonb,
  p_case_id      uuid default null,
  p_run_after    timestamptz default null,
  p_priority     smallint default 5,
  p_max_attempts smallint default 3
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.current_user_organization_id();
  v_id  uuid;
begin
  if v_org is null then raise exception 'No organization for user'; end if;
  insert into public.jobs (
    organization_id, kind, payload, case_id, priority, max_attempts,
    run_after, created_by
  ) values (
    v_org, p_kind, coalesce(p_payload, '{}'::jsonb), p_case_id, p_priority, p_max_attempts,
    coalesce(p_run_after, timezone('utc', now())), auth.uid()
  ) returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.enqueue_job(public.job_kind, jsonb, uuid, timestamptz, smallint, smallint) to authenticated;

-- ─── Job dequeue (worker) — atomic claim with SKIP LOCKED ───
-- Called by worker with service_role.
create or replace function public.dequeue_next_job(
  p_worker_id text,
  p_kinds     public.job_kind[] default null
)
returns setof public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.jobs%rowtype;
begin
  select * into v_row
  from public.jobs
  where status = 'queued'
    and run_after <= timezone('utc', now())
    and (p_kinds is null or kind = any(p_kinds))
  order by priority asc, created_at asc
  for update skip locked
  limit 1;

  if not found then return; end if;

  update public.jobs
     set status = 'running',
         locked_at = timezone('utc', now()),
         locked_by = p_worker_id,
         started_at = coalesce(started_at, timezone('utc', now())),
         attempts = attempts + 1
   where id = v_row.id
   returning * into v_row;

  return next v_row;
end;
$$;

-- ─── ocr_extractions (resultado de OCR, precisa revisão humana) ─
do $$ begin
  create type public.ocr_status as enum ('processing', 'awaiting_review', 'confirmed', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.ocr_extractions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  case_id          uuid references public.cases(id) on delete cascade,
  case_file_id     uuid references public.case_files(id) on delete cascade,
  target           text not null,        -- 'document' | 'clinical_form' | 'receipt'
  status           public.ocr_status not null default 'awaiting_review',
  raw_text         text,
  fields           jsonb not null default '{}'::jsonb,
  confidence       numeric(4,3),
  provider         text,
  model            text,
  reviewed_by      uuid references auth.users(id) on delete set null,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now()),
  unique (case_file_id, target)
);

drop trigger if exists set_updated_at_ocr_extractions on public.ocr_extractions;
create trigger set_updated_at_ocr_extractions before update on public.ocr_extractions
  for each row execute function public.set_updated_at();

create index if not exists ocr_extractions_case_idx on public.ocr_extractions (case_id);
create index if not exists ocr_extractions_org_status_idx
  on public.ocr_extractions (organization_id, status);

alter table public.ocr_extractions enable row level security;
alter table public.ocr_extractions force row level security;

drop policy if exists "ocr_extractions_select_internal" on public.ocr_extractions;
create policy "ocr_extractions_select_internal"
on public.ocr_extractions for select to authenticated
using (organization_id = public.current_user_organization_id() and public.is_internal_user());

drop policy if exists "ocr_extractions_update_internal" on public.ocr_extractions;
create policy "ocr_extractions_update_internal"
on public.ocr_extractions for update to authenticated
using (organization_id = public.current_user_organization_id() and public.is_internal_user())
with check (organization_id = public.current_user_organization_id() and public.is_internal_user());

-- ─── pdf_documents (índice de PDFs gerados) ─────────────────
create table if not exists public.pdf_documents (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  case_id          uuid references public.cases(id) on delete cascade,
  kind             text not null,        -- 'quote' | 'planning' | 'receipt' | 'case_report'
  reference_id     uuid,                 -- id do quote/planning/delivery etc
  storage_bucket   text not null,
  storage_path     text not null,
  file_name        text not null,
  file_size        int,
  generated_at     timestamptz not null default timezone('utc', now()),
  generated_by     uuid references auth.users(id) on delete set null
);

create index if not exists pdf_documents_case_idx on public.pdf_documents (case_id);
create index if not exists pdf_documents_org_kind_idx on public.pdf_documents (organization_id, kind, generated_at desc);

alter table public.pdf_documents enable row level security;
alter table public.pdf_documents force row level security;

drop policy if exists "pdf_documents_select_internal" on public.pdf_documents;
create policy "pdf_documents_select_internal"
on public.pdf_documents for select to authenticated
using (organization_id = public.current_user_organization_id() and public.is_internal_user());

drop policy if exists "pdf_documents_select_dentist" on public.pdf_documents;
create policy "pdf_documents_select_dentist"
on public.pdf_documents for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() = 'dentist'
  and (
    case_id is null
    or exists (
      select 1 from public.cases c
      join public.dentists d on d.id = c.dentist_id
      where c.id = pdf_documents.case_id and d.profile_id = auth.uid()
    )
  )
);

-- ─── api_keys (tokens da API pública) ───────────────────────
create table if not exists public.api_keys (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  key_prefix       text not null,        -- primeiros 8 chars, visível
  key_hash         text not null unique, -- sha256 do token
  scopes           text[] not null default '{}'::text[],
  last_used_at     timestamptz,
  expires_at       timestamptz,
  created_by       uuid references auth.users(id) on delete set null,
  revoked_at       timestamptz,
  created_at       timestamptz not null default timezone('utc', now())
);

create index if not exists api_keys_org_idx on public.api_keys (organization_id);

alter table public.api_keys enable row level security;
alter table public.api_keys force row level security;

drop policy if exists "api_keys_admin_all" on public.api_keys;
create policy "api_keys_admin_all"
on public.api_keys for all to authenticated
using (organization_id = public.current_user_organization_id() and public.current_user_role() in ('super_admin','admin'))
with check (organization_id = public.current_user_organization_id() and public.current_user_role() in ('super_admin','admin'));

-- ─── pdf-documents storage bucket ───────────────────────────
insert into storage.buckets (id, name, public)
values ('pdf-documents', 'pdf-documents', false)
on conflict (id) do nothing;

drop policy if exists "pdf_documents_bucket_select_internal" on storage.objects;
drop policy if exists "pdf_documents_bucket_select_dentist"  on storage.objects;

create policy "pdf_documents_bucket_select_internal"
on storage.objects for select to authenticated
using (
  bucket_id = 'pdf-documents'
  and public.storage_path_org(name) = public.current_user_organization_id()
  and public.is_internal_user()
);

create policy "pdf_documents_bucket_select_dentist"
on storage.objects for select to authenticated
using (
  bucket_id = 'pdf-documents'
  and public.storage_path_org(name) = public.current_user_organization_id()
  and exists (
    select 1 from public.pdf_documents pd
    join public.cases c on c.id = pd.case_id
    join public.dentists d on d.id = c.dentist_id
    where pd.storage_path = storage.objects.name
      and d.profile_id = auth.uid()
  )
);

-- ─── api_request_log (para rate-limit e billing) ────────────
create table if not exists public.api_request_log (
  id               bigserial primary key,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  api_key_id       uuid references public.api_keys(id) on delete set null,
  method           text not null,
  path             text not null,
  status_code      int not null,
  latency_ms       int,
  ip               text,
  user_agent       text,
  created_at       timestamptz not null default timezone('utc', now())
);

create index if not exists api_request_log_org_idx on public.api_request_log (organization_id, created_at desc);

alter table public.api_request_log enable row level security;
alter table public.api_request_log force row level security;

drop policy if exists "api_request_log_select_admin" on public.api_request_log;
create policy "api_request_log_select_admin"
on public.api_request_log for select to authenticated
using (organization_id = public.current_user_organization_id() and public.current_user_role() in ('super_admin','admin'));


-- =============================================================
-- 0039_phase6_saas_foundation.sql
-- =============================================================

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

