-- =============================================================
-- 0045 · Fase 10A · Produção (MES) + Técnicos
--
-- Módulo operacional para o chão do laboratório:
--   • production_stages       — etapas configuráveis por org (kanban colunas)
--   • production_cards        — cartão por caso, stage atual, prioridade, SLA
--   • production_events       — histórico imutável de transições/retrabalho
--   • technicians             — extensão de profiles (especialidade, custo)
--   • technician_skills       — habilidades + nível
--   • technician_availability — disponibilidade semanal (planejamento futuro)
--   • v_production_metrics    — agregados por stage
--   • v_technician_workload   — fila atual por técnico
--   • advance_production_card — RPC atômica para transição
--
-- Todas as tabelas: org-scoped, RLS strict, força RLS, políticas
-- baseadas em current_user_organization_id() + current_user_role().
-- Reusa: cases, profiles, audit trigger genérico, event bus (via app).
-- =============================================================

-- ─── enums ──────────────────────────────────────────────────
do $$ begin
  create type public.production_card_priority as enum (
    'low', 'normal', 'high', 'urgent'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.technician_status as enum (
    'active', 'inactive', 'vacation', 'on_leave'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.skill_level as enum (
    'beginner', 'intermediate', 'advanced', 'expert'
  );
exception when duplicate_object then null; end $$;

-- Adicionar novos job_kind (idempotente)
do $$ begin
  alter type public.job_kind add value if not exists 'production_sla_check';
exception when others then null; end $$;

-- ─── production_stages ──────────────────────────────────────
create table if not exists public.production_stages (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  name              text not null,
  slug              text not null,           -- 'received', 'modeling', ...
  description       text,
  color             text not null default '#6B7280',   -- hex
  position          int  not null default 0,           -- ordem no kanban
  sla_hours         int,                                -- opcional
  is_terminal       boolean not null default false,     -- fim do fluxo (pronto/entregue)
  is_rework         boolean not null default false,     -- coluna de retrabalho
  is_initial        boolean not null default false,     -- ponto de entrada padrão
  is_active         boolean not null default true,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now()),
  unique (organization_id, slug)
);

create index if not exists production_stages_org_idx on public.production_stages (organization_id, position);
create index if not exists production_stages_org_active_idx on public.production_stages (organization_id) where is_active;

-- garante 1 stage inicial por org
create unique index if not exists production_stages_one_initial_per_org
  on public.production_stages (organization_id)
  where is_initial and is_active;

drop trigger if exists set_updated_at_production_stages on public.production_stages;
create trigger set_updated_at_production_stages
before update on public.production_stages
for each row execute function public.set_updated_at();

alter table public.production_stages enable row level security;
alter table public.production_stages force row level security;

drop policy if exists "prod_stages_select" on public.production_stages;
create policy "prod_stages_select"
on public.production_stages for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  or public.is_platform_admin()
);

drop policy if exists "prod_stages_write_admin" on public.production_stages;
create policy "prod_stages_write_admin"
on public.production_stages for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning')
);

-- ─── production_cards ───────────────────────────────────────
create table if not exists public.production_cards (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  case_id            uuid not null references public.cases(id) on delete cascade,
  current_stage_id   uuid not null references public.production_stages(id) on delete restrict,
  assignee_id        uuid references auth.users(id) on delete set null,   -- técnico responsável
  priority           public.production_card_priority not null default 'normal',
  entered_stage_at   timestamptz not null default timezone('utc', now()),
  sla_due_at         timestamptz,
  completed_at       timestamptz,
  rework_count       int not null default 0,
  total_time_ms      bigint not null default 0,     -- tempo acumulado em todas as etapas
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default timezone('utc', now()),
  updated_at         timestamptz not null default timezone('utc', now()),
  unique (case_id)                                 -- 1 cartão por caso
);

create index if not exists production_cards_org_idx on public.production_cards (organization_id, current_stage_id, priority);
create index if not exists production_cards_assignee_idx on public.production_cards (assignee_id) where assignee_id is not null;
create index if not exists production_cards_sla_idx on public.production_cards (sla_due_at) where sla_due_at is not null and completed_at is null;
create index if not exists production_cards_active_idx on public.production_cards (organization_id, current_stage_id) where completed_at is null;

drop trigger if exists set_updated_at_production_cards on public.production_cards;
create trigger set_updated_at_production_cards
before update on public.production_cards
for each row execute function public.set_updated_at();

alter table public.production_cards enable row level security;
alter table public.production_cards force row level security;

drop policy if exists "prod_cards_select" on public.production_cards;
create policy "prod_cards_select"
on public.production_cards for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  or public.is_platform_admin()
);

drop policy if exists "prod_cards_write" on public.production_cards;
create policy "prod_cards_write"
on public.production_cards for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning','production','logistics')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning','production','logistics')
);

-- ─── production_events (histórico de transições) ────────────
create table if not exists public.production_events (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  card_id            uuid not null references public.production_cards(id) on delete cascade,
  from_stage_id      uuid references public.production_stages(id) on delete set null,
  to_stage_id        uuid not null references public.production_stages(id) on delete restrict,
  actor_id           uuid references auth.users(id) on delete set null,
  duration_ms        bigint not null default 0,   -- tempo permanecido na from_stage
  is_rework          boolean not null default false,
  reason             text,
  notes              text,
  metadata           jsonb not null default '{}'::jsonb,
  occurred_at        timestamptz not null default timezone('utc', now())
);

create index if not exists production_events_card_idx on public.production_events (card_id, occurred_at desc);
create index if not exists production_events_org_idx on public.production_events (organization_id, occurred_at desc);
create index if not exists production_events_actor_idx on public.production_events (actor_id, occurred_at desc) where actor_id is not null;
create index if not exists production_events_to_stage_idx on public.production_events (to_stage_id, occurred_at desc);

alter table public.production_events enable row level security;
alter table public.production_events force row level security;

drop policy if exists "prod_events_select" on public.production_events;
create policy "prod_events_select"
on public.production_events for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  or public.is_platform_admin()
);

-- events são imutáveis: sem update/delete pela camada de usuário
drop policy if exists "prod_events_insert" on public.production_events;
create policy "prod_events_insert"
on public.production_events for insert to authenticated
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning','production','logistics')
);

-- ─── technicians ────────────────────────────────────────────
create table if not exists public.technicians (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  profile_id         uuid not null references public.profiles(id) on delete cascade,
  specialty          text,                              -- 'prosthodontist_tech','ceramist','cad_operator',...
  team               text,
  status             public.technician_status not null default 'active',
  weekly_hours       int not null default 40,
  hourly_cost        numeric(10,2),                     -- BRL, opcional
  notes              text,
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default timezone('utc', now()),
  updated_at         timestamptz not null default timezone('utc', now()),
  unique (organization_id, profile_id)
);

create index if not exists technicians_org_idx on public.technicians (organization_id, status);
create index if not exists technicians_profile_idx on public.technicians (profile_id);

drop trigger if exists set_updated_at_technicians on public.technicians;
create trigger set_updated_at_technicians
before update on public.technicians
for each row execute function public.set_updated_at();

alter table public.technicians enable row level security;
alter table public.technicians force row level security;

drop policy if exists "technicians_select" on public.technicians;
create policy "technicians_select"
on public.technicians for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  or public.is_platform_admin()
);

drop policy if exists "technicians_write" on public.technicians;
create policy "technicians_write"
on public.technicians for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning')
);

-- ─── technician_skills ──────────────────────────────────────
create table if not exists public.technician_skills (
  id                 uuid primary key default gen_random_uuid(),
  technician_id      uuid not null references public.technicians(id) on delete cascade,
  skill              text not null,
  level              public.skill_level not null default 'intermediate',
  created_at         timestamptz not null default timezone('utc', now()),
  unique (technician_id, skill)
);

create index if not exists technician_skills_tech_idx on public.technician_skills (technician_id);

alter table public.technician_skills enable row level security;
alter table public.technician_skills force row level security;

drop policy if exists "tech_skills_select" on public.technician_skills;
create policy "tech_skills_select"
on public.technician_skills for select to authenticated
using (
  exists (select 1 from public.technicians t
          where t.id = technician_skills.technician_id
            and (t.organization_id = public.current_user_organization_id()
                 or public.is_platform_admin()))
);

drop policy if exists "tech_skills_write" on public.technician_skills;
create policy "tech_skills_write"
on public.technician_skills for all to authenticated
using (
  exists (select 1 from public.technicians t
          where t.id = technician_skills.technician_id
            and t.organization_id = public.current_user_organization_id()
            and public.current_user_role() in ('super_admin','admin','technical_planning'))
)
with check (
  exists (select 1 from public.technicians t
          where t.id = technician_skills.technician_id
            and t.organization_id = public.current_user_organization_id()
            and public.current_user_role() in ('super_admin','admin','technical_planning'))
);

-- ─── technician_availability ────────────────────────────────
create table if not exists public.technician_availability (
  id                 uuid primary key default gen_random_uuid(),
  technician_id      uuid not null references public.technicians(id) on delete cascade,
  weekday            smallint not null check (weekday between 0 and 6),   -- 0=Sunday
  start_time         time not null,
  end_time           time not null,
  created_at         timestamptz not null default timezone('utc', now()),
  check (end_time > start_time),
  unique (technician_id, weekday, start_time)
);

create index if not exists tech_avail_tech_idx on public.technician_availability (technician_id);

alter table public.technician_availability enable row level security;
alter table public.technician_availability force row level security;

drop policy if exists "tech_avail_select" on public.technician_availability;
create policy "tech_avail_select"
on public.technician_availability for select to authenticated
using (
  exists (select 1 from public.technicians t
          where t.id = technician_availability.technician_id
            and (t.organization_id = public.current_user_organization_id()
                 or public.is_platform_admin()))
);

drop policy if exists "tech_avail_write" on public.technician_availability;
create policy "tech_avail_write"
on public.technician_availability for all to authenticated
using (
  exists (select 1 from public.technicians t
          where t.id = technician_availability.technician_id
            and t.organization_id = public.current_user_organization_id()
            and public.current_user_role() in ('super_admin','admin','technical_planning'))
)
with check (
  exists (select 1 from public.technicians t
          where t.id = technician_availability.technician_id
            and t.organization_id = public.current_user_organization_id()
            and public.current_user_role() in ('super_admin','admin','technical_planning'))
);

-- ─── RPC advance_production_card ────────────────────────────
-- Transição atômica: registra o event com duration_ms, atualiza card,
-- reseta entered_stage_at, incrementa rework_count se necessário,
-- calcula sla_due_at pelo sla_hours da nova stage, marca completed_at
-- quando a nova stage é terminal.
create or replace function public.advance_production_card(
  p_card_id     uuid,
  p_to_stage_id uuid,
  p_reason      text default null,
  p_notes       text default null,
  p_is_rework   boolean default false
)
returns public.production_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card         public.production_cards;
  v_from_stage   uuid;
  v_from_at      timestamptz;
  v_duration_ms  bigint;
  v_to_stage     public.production_stages;
  v_now          timestamptz := timezone('utc', now());
  v_new_sla_due  timestamptz;
  v_actor        uuid := auth.uid();
begin
  select * into v_card from public.production_cards where id = p_card_id for update;
  if not found then
    raise exception 'production card not found: %', p_card_id;
  end if;

  -- valida same-org da stage destino
  select * into v_to_stage from public.production_stages
    where id = p_to_stage_id and organization_id = v_card.organization_id;
  if not found then
    raise exception 'target stage not found in same organization';
  end if;
  if not v_to_stage.is_active then
    raise exception 'target stage is inactive';
  end if;

  v_from_stage := v_card.current_stage_id;
  v_from_at    := v_card.entered_stage_at;
  v_duration_ms := extract(epoch from (v_now - v_from_at)) * 1000;

  if v_to_stage.sla_hours is not null then
    v_new_sla_due := v_now + make_interval(hours => v_to_stage.sla_hours);
  end if;

  insert into public.production_events (
    organization_id, card_id, from_stage_id, to_stage_id,
    actor_id, duration_ms, is_rework, reason, notes, occurred_at
  ) values (
    v_card.organization_id, p_card_id, v_from_stage, p_to_stage_id,
    v_actor, coalesce(v_duration_ms, 0), coalesce(p_is_rework, false),
    p_reason, p_notes, v_now
  );

  update public.production_cards
    set current_stage_id  = p_to_stage_id,
        entered_stage_at  = v_now,
        sla_due_at        = v_new_sla_due,
        completed_at      = case when v_to_stage.is_terminal then v_now else null end,
        rework_count      = rework_count + case when p_is_rework then 1 else 0 end,
        total_time_ms     = total_time_ms + coalesce(v_duration_ms, 0),
        updated_at        = v_now
    where id = p_card_id
    returning * into v_card;

  return v_card;
end;
$$;

grant execute on function public.advance_production_card(uuid, uuid, text, text, boolean) to authenticated;

-- ─── seed default stages por organização ────────────────────
create or replace function public.seed_default_production_stages(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.production_stages (organization_id, name, slug, color, position, sla_hours, is_terminal, is_rework, is_initial)
  values
    (p_org_id, 'Recebido',           'received',    '#94A3B8',  0,   24, false, false, true),
    (p_org_id, 'Modelagem',          'modeling',    '#3B82F6', 10,   48, false, false, false),
    (p_org_id, 'Impressão',          'printing',    '#8B5CF6', 20,   24, false, false, false),
    (p_org_id, 'Fundição/Usinagem',  'production',  '#F59E0B', 30,   72, false, false, false),
    (p_org_id, 'Acabamento',         'finishing',   '#10B981', 40,   24, false, false, false),
    (p_org_id, 'Polimento',          'polishing',   '#14B8A6', 50,   12, false, false, false),
    (p_org_id, 'Controle Qualidade', 'qc',          '#EAB308', 60,   12, false, false, false),
    (p_org_id, 'Retrabalho',         'rework',      '#EF4444', 70, null, false, true,  false),
    (p_org_id, 'Pronto',             'ready',       '#22C55E', 80, null, true,  false, false)
  on conflict (organization_id, slug) do nothing;
end;
$$;

grant execute on function public.seed_default_production_stages(uuid) to authenticated;

-- Seed para orgs existentes (idempotente)
do $$
declare r record;
begin
  for r in select id from public.organizations where deleted_at is null loop
    perform public.seed_default_production_stages(r.id);
  end loop;
end $$;

-- ─── view: métricas por stage (ativas, atrasadas, tempo médio) ─
create or replace view public.v_production_metrics
with (security_invoker = true)
as
select
  s.organization_id,
  s.id                                                       as stage_id,
  s.name                                                     as stage_name,
  s.color                                                    as stage_color,
  s.position,
  s.is_terminal,
  s.is_rework,
  count(c.id) filter (where c.completed_at is null)          as active_cards,
  count(c.id) filter (where c.completed_at is null
                        and c.sla_due_at is not null
                        and c.sla_due_at < timezone('utc', now()))            as overdue_cards,
  avg(extract(epoch from (coalesce(c.completed_at, timezone('utc', now()))
                          - c.entered_stage_at)))
    filter (where c.completed_at is null)                                     as avg_time_in_stage_seconds
from public.production_stages s
left join public.production_cards c on c.current_stage_id = s.id
where s.is_active
group by s.organization_id, s.id, s.name, s.color, s.position, s.is_terminal, s.is_rework;

grant select on public.v_production_metrics to authenticated;

-- ─── view: workload por técnico ─────────────────────────────
create or replace view public.v_technician_workload
with (security_invoker = true)
as
select
  t.id                                                        as technician_id,
  t.organization_id,
  t.profile_id,
  p.full_name                                                 as technician_name,
  t.specialty,
  t.status,
  count(c.id) filter (where c.completed_at is null)           as active_cards,
  count(c.id) filter (where c.completed_at is null
                        and c.sla_due_at is not null
                        and c.sla_due_at < timezone('utc', now())) as overdue_cards,
  count(c.id) filter (where c.priority = 'urgent'
                        and c.completed_at is null)           as urgent_cards,
  coalesce(sum(c.rework_count), 0)                            as total_rework
from public.technicians t
left join public.profiles p on p.id = t.profile_id
left join public.production_cards c on c.assignee_id = t.profile_id
                                    and c.organization_id = t.organization_id
group by t.id, t.organization_id, t.profile_id, p.name, t.specialty, t.status;

grant select on public.v_technician_workload to authenticated;

-- ─── done ───────────────────────────────────────────────────
