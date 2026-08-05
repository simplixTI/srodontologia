-- =============================================================
-- 0047 · Fase 10C · Quality Control + Entregas v2
--
-- Bloco QC:
--   • qc_checklists       — templates de inspeção por org (+opcional case_type)
--   • qc_checklist_items  — items de template
--   • qc_inspections      — inspeção real ligada a production_card
--   • qc_inspection_items — respostas item-a-item
--   • qc_photos           — evidência fotográfica
--   • view v_qc_metrics   — passa/reprova por período
--   • RPC finalize_qc_inspection — grava resultado + envia p/ retrabalho se falha
--
-- Bloco Entregas v2 (aditivo sobre deliveries 0029):
--   • delivery_drivers    — motoristas (extensão de profiles opcional)
--   • delivery_carriers   — transportadoras cadastradas
--   • delivery_routes     — rotas configuráveis (cluster de destinos)
--   • delivery_manifests  — romaneios (grupos de deliveries)
--   • delivery_manifest_items — join manifest ↔ delivery
--   • delivery_incidents  — ocorrências durante o transporte
--   • deliveries +driver_id/manifest_id/qr_code/route_id
-- =============================================================

-- ─── enums ──────────────────────────────────────────────────
do $$ begin
  create type public.qc_inspection_status as enum (
    'pending', 'in_progress', 'passed', 'failed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.qc_item_result as enum (
    'pending', 'pass', 'fail', 'na'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.driver_status as enum (
    'active', 'inactive', 'vacation', 'on_leave'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.manifest_status as enum (
    'draft', 'ready', 'dispatched', 'in_transit', 'completed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.incident_severity as enum (
    'info', 'warning', 'error', 'critical'
  );
exception when duplicate_object then null; end $$;

-- ─── qc_checklists ──────────────────────────────────────────
create table if not exists public.qc_checklists (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  case_type_id      uuid references public.case_types(id) on delete set null,
  name              text not null,
  description       text,
  is_default        boolean not null default false,
  is_active         boolean not null default true,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now()),
  unique (organization_id, name)
);

create index if not exists qc_checklists_org_idx on public.qc_checklists (organization_id, is_active);
create index if not exists qc_checklists_type_idx on public.qc_checklists (case_type_id) where case_type_id is not null;

drop trigger if exists set_updated_at_qc_checklists on public.qc_checklists;
create trigger set_updated_at_qc_checklists
before update on public.qc_checklists
for each row execute function public.set_updated_at();

alter table public.qc_checklists enable row level security;
alter table public.qc_checklists force row level security;

drop policy if exists "qc_checklists_select" on public.qc_checklists;
create policy "qc_checklists_select"
on public.qc_checklists for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  or public.is_platform_admin()
);

drop policy if exists "qc_checklists_write" on public.qc_checklists;
create policy "qc_checklists_write"
on public.qc_checklists for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning','production')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning','production')
);

-- ─── qc_checklist_items ─────────────────────────────────────
create table if not exists public.qc_checklist_items (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  checklist_id      uuid not null references public.qc_checklists(id) on delete cascade,
  label             text not null,
  description       text,
  position          int not null default 0,
  is_critical       boolean not null default false,
  created_at        timestamptz not null default timezone('utc', now())
);

create index if not exists qc_checklist_items_checklist_idx on public.qc_checklist_items (checklist_id, position);

alter table public.qc_checklist_items enable row level security;
alter table public.qc_checklist_items force row level security;

drop policy if exists "qc_checklist_items_select" on public.qc_checklist_items;
create policy "qc_checklist_items_select"
on public.qc_checklist_items for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  or public.is_platform_admin()
);

drop policy if exists "qc_checklist_items_write" on public.qc_checklist_items;
create policy "qc_checklist_items_write"
on public.qc_checklist_items for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning','production')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning','production')
);

-- ─── qc_inspections ─────────────────────────────────────────
create table if not exists public.qc_inspections (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  case_id               uuid not null references public.cases(id) on delete cascade,
  production_card_id    uuid references public.production_cards(id) on delete set null,
  checklist_id          uuid references public.qc_checklists(id) on delete set null,
  status                public.qc_inspection_status not null default 'pending',
  overall_notes         text,
  inspector_id          uuid references auth.users(id) on delete set null,
  started_at            timestamptz,
  finished_at           timestamptz,
  rework_stage_id       uuid references public.production_stages(id) on delete set null,
  created_by            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now())
);

create index if not exists qc_inspections_case_idx on public.qc_inspections (case_id, created_at desc);
create index if not exists qc_inspections_card_idx on public.qc_inspections (production_card_id);
create index if not exists qc_inspections_status_idx on public.qc_inspections (organization_id, status);

drop trigger if exists set_updated_at_qc_inspections on public.qc_inspections;
create trigger set_updated_at_qc_inspections
before update on public.qc_inspections
for each row execute function public.set_updated_at();

alter table public.qc_inspections enable row level security;
alter table public.qc_inspections force row level security;

drop policy if exists "qc_inspections_select" on public.qc_inspections;
create policy "qc_inspections_select"
on public.qc_inspections for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

drop policy if exists "qc_inspections_write" on public.qc_inspections;
create policy "qc_inspections_write"
on public.qc_inspections for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning','production')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning','production')
);

-- ─── qc_inspection_items ────────────────────────────────────
create table if not exists public.qc_inspection_items (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  inspection_id     uuid not null references public.qc_inspections(id) on delete cascade,
  checklist_item_id uuid references public.qc_checklist_items(id) on delete set null,
  label             text not null,
  is_critical       boolean not null default false,
  position          int not null default 0,
  result            public.qc_item_result not null default 'pending',
  reason            text,
  notes             text,
  answered_by       uuid references auth.users(id) on delete set null,
  answered_at       timestamptz,
  created_at        timestamptz not null default timezone('utc', now())
);

create index if not exists qc_ii_inspection_idx on public.qc_inspection_items (inspection_id, position);
create index if not exists qc_ii_fail_idx on public.qc_inspection_items (inspection_id) where result = 'fail';

alter table public.qc_inspection_items enable row level security;
alter table public.qc_inspection_items force row level security;

drop policy if exists "qc_ii_select" on public.qc_inspection_items;
create policy "qc_ii_select"
on public.qc_inspection_items for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

drop policy if exists "qc_ii_write" on public.qc_inspection_items;
create policy "qc_ii_write"
on public.qc_inspection_items for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning','production')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning','production')
);

-- ─── qc_photos ──────────────────────────────────────────────
create table if not exists public.qc_photos (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  inspection_id         uuid not null references public.qc_inspections(id) on delete cascade,
  inspection_item_id    uuid references public.qc_inspection_items(id) on delete cascade,
  storage_path          text not null,   -- caminho no bucket case-files
  caption               text,
  uploaded_by           uuid references auth.users(id) on delete set null,
  uploaded_at           timestamptz not null default timezone('utc', now())
);

create index if not exists qc_photos_inspection_idx on public.qc_photos (inspection_id);

alter table public.qc_photos enable row level security;
alter table public.qc_photos force row level security;

drop policy if exists "qc_photos_select" on public.qc_photos;
create policy "qc_photos_select"
on public.qc_photos for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

drop policy if exists "qc_photos_write" on public.qc_photos;
create policy "qc_photos_write"
on public.qc_photos for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning','production')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning','production')
);

-- ─── RPC: instantiate_qc_inspection ─────────────────────────
create or replace function public.instantiate_qc_inspection(
  p_case_id      uuid,
  p_card_id      uuid,
  p_checklist_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_id uuid;
begin
  select organization_id into v_org from public.cases where id = p_case_id;
  if v_org is null then raise exception 'case not found'; end if;

  insert into public.qc_inspections (
    organization_id, case_id, production_card_id, checklist_id,
    status, created_by, started_at
  ) values (
    v_org, p_case_id, p_card_id, p_checklist_id,
    'in_progress', auth.uid(), timezone('utc', now())
  ) returning id into v_id;

  if p_checklist_id is not null then
    insert into public.qc_inspection_items (
      organization_id, inspection_id, checklist_item_id, label, is_critical, position
    )
    select v_org, v_id, ci.id, ci.label, ci.is_critical, ci.position
    from public.qc_checklist_items ci
    where ci.checklist_id = p_checklist_id
    order by ci.position;
  end if;

  return v_id;
end;
$$;

grant execute on function public.instantiate_qc_inspection(uuid, uuid, uuid) to authenticated;

-- ─── RPC: finalize_qc_inspection ────────────────────────────
-- Se passed → status='passed', envia card_id p/ próxima etapa (não-crítica)
-- Se failed → status='failed', envia card_id para stage de retrabalho (marca is_rework=true)
create or replace function public.finalize_qc_inspection(
  p_inspection_id uuid,
  p_rework_stage_id uuid default null
)
returns public.qc_inspections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ins   public.qc_inspections;
  v_fails int;
  v_org   uuid;
  v_now   timestamptz := timezone('utc', now());
  v_rework_stage uuid;
begin
  select * into v_ins from public.qc_inspections where id = p_inspection_id for update;
  if v_ins.id is null then raise exception 'inspection not found'; end if;
  v_org := v_ins.organization_id;

  select count(*) into v_fails
    from public.qc_inspection_items
    where inspection_id = p_inspection_id
      and result = 'fail';

  if v_fails = 0 then
    update public.qc_inspections
      set status = 'passed', finished_at = v_now
      where id = p_inspection_id returning * into v_ins;
  else
    update public.qc_inspections
      set status = 'failed',
          finished_at = v_now,
          rework_stage_id = p_rework_stage_id
      where id = p_inspection_id returning * into v_ins;

    -- Auto-move para retrabalho se cartão vinculado e stage fornecido
    if v_ins.production_card_id is not null then
      v_rework_stage := p_rework_stage_id;
      if v_rework_stage is null then
        select id into v_rework_stage
          from public.production_stages
          where organization_id = v_org
            and is_rework
            and is_active
          limit 1;
      end if;

      if v_rework_stage is not null then
        perform public.advance_production_card(
          v_ins.production_card_id,
          v_rework_stage,
          'Reprovado no QC (' || v_fails::text || ' falha(s))',
          v_ins.overall_notes,
          true
        );
      end if;
    end if;
  end if;

  return v_ins;
end;
$$;

grant execute on function public.finalize_qc_inspection(uuid, uuid) to authenticated;

-- ─── view: métricas QC ──────────────────────────────────────
create or replace view public.v_qc_metrics
with (security_invoker = true)
as
select
  organization_id,
  count(*) filter (where status = 'passed')                                 as passed_total,
  count(*) filter (where status = 'failed')                                 as failed_total,
  count(*) filter (where status = 'passed' and finished_at > now() - interval '7 days')  as passed_7d,
  count(*) filter (where status = 'failed' and finished_at > now() - interval '7 days')  as failed_7d,
  count(*) filter (where status in ('pending','in_progress'))               as open_total
from public.qc_inspections
group by organization_id;

grant select on public.v_qc_metrics to authenticated;

-- =============================================================
-- Entregas v2
-- =============================================================

-- ─── delivery_drivers ───────────────────────────────────────
create table if not exists public.delivery_drivers (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  profile_id        uuid references public.profiles(id) on delete set null,
  full_name         text not null,
  phone             text,
  document          text,                     -- CPF/CNH mascarado
  vehicle_plate     text,
  vehicle_model     text,
  status            public.driver_status not null default 'active',
  notes             text,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now())
);

create index if not exists delivery_drivers_org_idx on public.delivery_drivers (organization_id, status);

drop trigger if exists set_updated_at_delivery_drivers on public.delivery_drivers;
create trigger set_updated_at_delivery_drivers
before update on public.delivery_drivers
for each row execute function public.set_updated_at();

alter table public.delivery_drivers enable row level security;
alter table public.delivery_drivers force row level security;

drop policy if exists "dd_select" on public.delivery_drivers;
create policy "dd_select"
on public.delivery_drivers for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  or public.is_platform_admin()
);

drop policy if exists "dd_write" on public.delivery_drivers;
create policy "dd_write"
on public.delivery_drivers for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','logistics')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','logistics')
);

-- ─── delivery_carriers ──────────────────────────────────────
create table if not exists public.delivery_carriers (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  name              text not null,
  contact_name      text,
  phone             text,
  email             text,
  tracking_url_template text,   -- ex: 'https://correios.com.br/track/{code}'
  is_active         boolean not null default true,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now())
);

create index if not exists delivery_carriers_org_idx on public.delivery_carriers (organization_id, is_active);

drop trigger if exists set_updated_at_delivery_carriers on public.delivery_carriers;
create trigger set_updated_at_delivery_carriers
before update on public.delivery_carriers
for each row execute function public.set_updated_at();

alter table public.delivery_carriers enable row level security;
alter table public.delivery_carriers force row level security;

drop policy if exists "dc_select" on public.delivery_carriers;
create policy "dc_select"
on public.delivery_carriers for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  or public.is_platform_admin()
);

drop policy if exists "dc_write" on public.delivery_carriers;
create policy "dc_write"
on public.delivery_carriers for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','logistics')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','logistics')
);

-- ─── delivery_routes ────────────────────────────────────────
create table if not exists public.delivery_routes (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  name              text not null,
  description       text,
  region            text,
  driver_id         uuid references public.delivery_drivers(id) on delete set null,
  is_active         boolean not null default true,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now())
);

create index if not exists delivery_routes_org_idx on public.delivery_routes (organization_id, is_active);
create index if not exists delivery_routes_driver_idx on public.delivery_routes (driver_id) where driver_id is not null;

drop trigger if exists set_updated_at_delivery_routes on public.delivery_routes;
create trigger set_updated_at_delivery_routes
before update on public.delivery_routes
for each row execute function public.set_updated_at();

alter table public.delivery_routes enable row level security;
alter table public.delivery_routes force row level security;

drop policy if exists "dr_select" on public.delivery_routes;
create policy "dr_select"
on public.delivery_routes for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  or public.is_platform_admin()
);

drop policy if exists "dr_write" on public.delivery_routes;
create policy "dr_write"
on public.delivery_routes for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','logistics')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','logistics')
);

-- ─── delivery_manifests (romaneios) ─────────────────────────
create table if not exists public.delivery_manifests (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  code              text not null,        -- ex: ROM-000123 (gerado)
  route_id          uuid references public.delivery_routes(id) on delete set null,
  driver_id         uuid references public.delivery_drivers(id) on delete set null,
  carrier_id        uuid references public.delivery_carriers(id) on delete set null,
  status            public.manifest_status not null default 'draft',
  qr_token          text unique,          -- token para QR/tracking público (opaco)
  dispatched_at     timestamptz,
  completed_at      timestamptz,
  notes             text,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create index if not exists delivery_manifests_org_idx on public.delivery_manifests (organization_id, status);
create index if not exists delivery_manifests_route_idx on public.delivery_manifests (route_id) where route_id is not null;

drop trigger if exists set_updated_at_delivery_manifests on public.delivery_manifests;
create trigger set_updated_at_delivery_manifests
before update on public.delivery_manifests
for each row execute function public.set_updated_at();

alter table public.delivery_manifests enable row level security;
alter table public.delivery_manifests force row level security;

drop policy if exists "dm_select" on public.delivery_manifests;
create policy "dm_select"
on public.delivery_manifests for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

drop policy if exists "dm_write" on public.delivery_manifests;
create policy "dm_write"
on public.delivery_manifests for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','logistics')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','logistics')
);

-- ─── delivery_manifest_items (join manifest ↔ delivery) ─────
create table if not exists public.delivery_manifest_items (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  manifest_id       uuid not null references public.delivery_manifests(id) on delete cascade,
  delivery_id       uuid not null references public.deliveries(id) on delete cascade,
  position          int not null default 0,
  created_at        timestamptz not null default timezone('utc', now()),
  unique (manifest_id, delivery_id)
);

create index if not exists dmi_manifest_idx on public.delivery_manifest_items (manifest_id, position);
create index if not exists dmi_delivery_idx on public.delivery_manifest_items (delivery_id);

alter table public.delivery_manifest_items enable row level security;
alter table public.delivery_manifest_items force row level security;

drop policy if exists "dmi_select" on public.delivery_manifest_items;
create policy "dmi_select"
on public.delivery_manifest_items for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

drop policy if exists "dmi_write" on public.delivery_manifest_items;
create policy "dmi_write"
on public.delivery_manifest_items for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','logistics')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','logistics')
);

-- ─── delivery_incidents ─────────────────────────────────────
create table if not exists public.delivery_incidents (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  delivery_id       uuid references public.deliveries(id) on delete cascade,
  manifest_id       uuid references public.delivery_manifests(id) on delete set null,
  severity          public.incident_severity not null default 'warning',
  kind              text not null,   -- 'delay', 'damage', 'lost', 'wrong_address', 'return', 'other'
  description       text not null,
  reported_by       uuid references auth.users(id) on delete set null,
  resolved_at       timestamptz,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default timezone('utc', now())
);

create index if not exists di_delivery_idx on public.delivery_incidents (delivery_id) where delivery_id is not null;
create index if not exists di_manifest_idx on public.delivery_incidents (manifest_id) where manifest_id is not null;
create index if not exists di_open_idx on public.delivery_incidents (organization_id, created_at desc) where resolved_at is null;

alter table public.delivery_incidents enable row level security;
alter table public.delivery_incidents force row level security;

drop policy if exists "di_select" on public.delivery_incidents;
create policy "di_select"
on public.delivery_incidents for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

drop policy if exists "di_write" on public.delivery_incidents;
create policy "di_write"
on public.delivery_incidents for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','logistics','production')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','logistics','production')
);

-- ─── deliveries: colunas novas ──────────────────────────────
alter table public.deliveries
  add column if not exists driver_id       uuid references public.delivery_drivers(id) on delete set null,
  add column if not exists carrier_id      uuid references public.delivery_carriers(id) on delete set null,
  add column if not exists route_id        uuid references public.delivery_routes(id) on delete set null,
  add column if not exists manifest_id     uuid references public.delivery_manifests(id) on delete set null,
  add column if not exists qr_token        text unique,
  add column if not exists barcode         text,
  add column if not exists origin_address  text,
  add column if not exists destination_address text,
  add column if not exists dispatched_at   timestamptz;

create index if not exists deliveries_manifest_idx on public.deliveries (manifest_id) where manifest_id is not null;
create index if not exists deliveries_driver_idx on public.deliveries (driver_id) where driver_id is not null;

-- ─── RPC: gerar código do manifesto ─────────────────────────
create or replace function public.next_manifest_code(p_org_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next int;
begin
  select coalesce(max(nullif(regexp_replace(code, '\D', '', 'g'), '')::int), 0) + 1
    into v_next
    from public.delivery_manifests
    where organization_id = p_org_id;
  return 'ROM-' || lpad(v_next::text, 6, '0');
end;
$$;

grant execute on function public.next_manifest_code(uuid) to authenticated;

-- ─── view: KPIs logísticos ──────────────────────────────────
create or replace view public.v_delivery_kpis
with (security_invoker = true)
as
select
  organization_id,
  count(*) filter (where status = 'delivered'
                     and delivered_at > now() - interval '30 days') as delivered_30d,
  count(*) filter (where status in ('pending','dispatched','in_transit')) as open_total,
  count(*) filter (where status = 'dispatched') as dispatched_total,
  count(*) filter (where status = 'in_transit') as in_transit_total,
  count(*) filter (where status = 'delivered' and delivered_at > now() - interval '7 days') as delivered_7d
from public.deliveries
group by organization_id;

grant select on public.v_delivery_kpis to authenticated;
