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
