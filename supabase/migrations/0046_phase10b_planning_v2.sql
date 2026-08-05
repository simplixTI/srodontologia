-- =============================================================
-- 0046 · Fase 10B · Planejamento v2
--
-- Expande o módulo Planejamento sobre a fundação da 0027:
--   • planning_templates + planning_template_items
--       — templates reutilizáveis por tipo de caso, com checklist
--   • planning_checklist_items
--       — checklist por versão (instanciado do template ou ad-hoc)
--   • planning_comments
--       — thread de comentários por versão (interno + dentista via portal)
--   • planning_versions +signature/promotion fields
--       — dentist_signed_at, internal_signed_at, promoted_to_production_at,
--         checklist_completed_at
--   • promote_planning_to_production(version_id) RPC
--       — cria (ou reusa) production_card ligado ao case_id do planejamento
--   • view v_planning_activity — resumo por versão (comentários, checklist)
--
-- Tudo org-scoped, RLS strict, mantém compatibilidade com 0027.
-- =============================================================

-- ─── planning_versions: novos campos ────────────────────────
alter table public.planning_versions
  add column if not exists dentist_signed_at         timestamptz,
  add column if not exists dentist_signed_ip         text,
  add column if not exists dentist_signed_ua         text,
  add column if not exists internal_signed_at        timestamptz,
  add column if not exists internal_signed_by        uuid references auth.users(id) on delete set null,
  add column if not exists checklist_completed_at    timestamptz,
  add column if not exists sent_at                   timestamptz,
  add column if not exists promoted_to_production_at timestamptz,
  add column if not exists production_card_id        uuid references public.production_cards(id) on delete set null,
  add column if not exists template_id               uuid,
  add column if not exists estimated_delivery_at     timestamptz;

create index if not exists planning_versions_promoted_idx on public.planning_versions (promoted_to_production_at desc) where promoted_to_production_at is not null;

-- ─── planning_templates ─────────────────────────────────────
create table if not exists public.planning_templates (
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

create index if not exists planning_templates_org_idx on public.planning_templates (organization_id, is_active);
create index if not exists planning_templates_case_type_idx on public.planning_templates (case_type_id) where case_type_id is not null;

drop trigger if exists set_updated_at_planning_templates on public.planning_templates;
create trigger set_updated_at_planning_templates
before update on public.planning_templates
for each row execute function public.set_updated_at();

alter table public.planning_templates enable row level security;
alter table public.planning_templates force row level security;

drop policy if exists "planning_templates_select" on public.planning_templates;
create policy "planning_templates_select"
on public.planning_templates for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  or public.is_platform_admin()
);

drop policy if exists "planning_templates_write" on public.planning_templates;
create policy "planning_templates_write"
on public.planning_templates for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning')
);

-- Add fkey now that table exists (safe, IF NOT EXISTS pattern)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'planning_versions'
      and constraint_name = 'planning_versions_template_id_fkey'
  ) then
    alter table public.planning_versions
      add constraint planning_versions_template_id_fkey
      foreign key (template_id) references public.planning_templates(id) on delete set null;
  end if;
end $$;

-- ─── planning_template_items ────────────────────────────────
create table if not exists public.planning_template_items (
  id                uuid primary key default gen_random_uuid(),
  template_id       uuid not null references public.planning_templates(id) on delete cascade,
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  label             text not null,
  description       text,
  position          int not null default 0,
  is_required       boolean not null default true,
  created_at        timestamptz not null default timezone('utc', now())
);

create index if not exists pti_template_idx on public.planning_template_items (template_id, position);

alter table public.planning_template_items enable row level security;
alter table public.planning_template_items force row level security;

drop policy if exists "pti_select" on public.planning_template_items;
create policy "pti_select"
on public.planning_template_items for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  or public.is_platform_admin()
);

drop policy if exists "pti_write" on public.planning_template_items;
create policy "pti_write"
on public.planning_template_items for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning')
);

-- ─── planning_checklist_items (por versão) ──────────────────
create table if not exists public.planning_checklist_items (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  planning_version_id   uuid not null references public.planning_versions(id) on delete cascade,
  label                 text not null,
  description           text,
  position              int not null default 0,
  is_required           boolean not null default true,
  is_done               boolean not null default false,
  done_by               uuid references auth.users(id) on delete set null,
  done_at               timestamptz,
  notes                 text,
  created_at            timestamptz not null default timezone('utc', now())
);

create index if not exists pci_version_idx on public.planning_checklist_items (planning_version_id, position);
create index if not exists pci_pending_idx on public.planning_checklist_items (planning_version_id) where not is_done;

alter table public.planning_checklist_items enable row level security;
alter table public.planning_checklist_items force row level security;

drop policy if exists "pci_select" on public.planning_checklist_items;
create policy "pci_select"
on public.planning_checklist_items for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

drop policy if exists "pci_write" on public.planning_checklist_items;
create policy "pci_write"
on public.planning_checklist_items for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning','production')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','technical_planning','production')
);

-- ─── planning_comments ──────────────────────────────────────
create table if not exists public.planning_comments (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  planning_version_id   uuid not null references public.planning_versions(id) on delete cascade,
  author_id             uuid references auth.users(id) on delete set null,
  is_internal           boolean not null default false,     -- true = visível só time interno
  body                  text not null,
  created_at            timestamptz not null default timezone('utc', now())
);

create index if not exists pc_version_idx on public.planning_comments (planning_version_id, created_at desc);

alter table public.planning_comments enable row level security;
alter table public.planning_comments force row level security;

drop policy if exists "pc_select_internal" on public.planning_comments;
create policy "pc_select_internal"
on public.planning_comments for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

drop policy if exists "pc_select_dentist" on public.planning_comments;
create policy "pc_select_dentist"
on public.planning_comments for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and not is_internal
  and exists (
    select 1 from public.planning_versions pv
    join public.cases c on c.id = pv.case_id
    join public.dentists d on d.id = c.dentist_id
    where pv.id = planning_comments.planning_version_id
      and pv.status <> 'draft'
      and d.profile_id = auth.uid()
  )
);

drop policy if exists "pc_insert_internal" on public.planning_comments;
create policy "pc_insert_internal"
on public.planning_comments for insert to authenticated
with check (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

drop policy if exists "pc_insert_dentist" on public.planning_comments;
create policy "pc_insert_dentist"
on public.planning_comments for insert to authenticated
with check (
  organization_id = public.current_user_organization_id()
  and not is_internal
  and exists (
    select 1 from public.planning_versions pv
    join public.cases c on c.id = pv.case_id
    join public.dentists d on d.id = c.dentist_id
    where pv.id = planning_comments.planning_version_id
      and d.profile_id = auth.uid()
  )
);

-- ─── RPC: instantiate_planning_checklist ───────────────────
-- Copia items do template para a versão. Usado ao criar draft.
create or replace function public.instantiate_planning_checklist(
  p_version_id  uuid,
  p_template_id uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_count int := 0;
begin
  select organization_id into v_org from public.planning_versions where id = p_version_id;
  if v_org is null then
    raise exception 'planning version not found';
  end if;

  insert into public.planning_checklist_items (
    organization_id, planning_version_id, label, description, position, is_required
  )
  select v_org, p_version_id, ti.label, ti.description, ti.position, ti.is_required
  from public.planning_template_items ti
  where ti.template_id = p_template_id
    and ti.organization_id = v_org;

  get diagnostics v_count = row_count;

  update public.planning_versions
    set template_id = p_template_id
    where id = p_version_id;

  return v_count;
end;
$$;

grant execute on function public.instantiate_planning_checklist(uuid, uuid) to authenticated;

-- ─── RPC: promote_planning_to_production ───────────────────
-- Ao aprovar+promover: cria (ou reusa) production_card na etapa inicial
-- da organização; marca planning_versions.promoted_to_production_at.
create or replace function public.promote_planning_to_production(
  p_version_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case_id  uuid;
  v_org_id   uuid;
  v_status   public.planning_status;
  v_card_id  uuid;
  v_stage_id uuid;
  v_sla      int;
  v_actor    uuid := auth.uid();
begin
  select case_id, organization_id, status
    into v_case_id, v_org_id, v_status
    from public.planning_versions where id = p_version_id for update;

  if v_case_id is null then
    raise exception 'planning version not found';
  end if;
  if v_status <> 'approved' then
    raise exception 'planning must be approved before promotion (current: %)', v_status;
  end if;

  -- Reuse existing card if any
  select id into v_card_id from public.production_cards where case_id = v_case_id;

  if v_card_id is null then
    select id, sla_hours into v_stage_id, v_sla
      from public.production_stages
      where organization_id = v_org_id and is_initial = true and is_active = true
      limit 1;
    if v_stage_id is null then
      raise exception 'no initial production stage configured for organization';
    end if;

    insert into public.production_cards (
      organization_id, case_id, current_stage_id, sla_due_at
    ) values (
      v_org_id, v_case_id, v_stage_id,
      case when v_sla is not null then timezone('utc', now()) + make_interval(hours => v_sla) else null end
    ) returning id into v_card_id;
  end if;

  update public.planning_versions
    set promoted_to_production_at = timezone('utc', now()),
        production_card_id = v_card_id
    where id = p_version_id;

  insert into public.planning_actions (
    organization_id, planning_version_id, action, comment, performed_by
  ) values (
    v_org_id, p_version_id, 'promoted_to_production',
    format('Cartão de produção %s criado', v_card_id), v_actor
  );

  return v_card_id;
end;
$$;

grant execute on function public.promote_planning_to_production(uuid) to authenticated;

-- ─── view v_planning_activity ───────────────────────────────
create or replace view public.v_planning_activity
with (security_invoker = true)
as
select
  pv.id                                                                          as version_id,
  pv.case_id,
  pv.organization_id,
  pv.version_number,
  pv.status,
  pv.created_at,
  pv.approved_at,
  pv.promoted_to_production_at,
  (select count(*) from public.planning_comments pc where pc.planning_version_id = pv.id) as comment_count,
  (select count(*) from public.planning_checklist_items ci where ci.planning_version_id = pv.id) as checklist_total,
  (select count(*) from public.planning_checklist_items ci where ci.planning_version_id = pv.id and ci.is_done) as checklist_done
from public.planning_versions pv;

grant select on public.v_planning_activity to authenticated;
