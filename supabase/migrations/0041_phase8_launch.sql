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
