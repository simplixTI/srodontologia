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
