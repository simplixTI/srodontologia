-- =============================================================
-- 0035 · Audit triggers automáticos
-- Escreve em public.audit_logs para operações críticas.
-- Não loga SELECT. Somente INSERT/UPDATE/DELETE.
-- Trigger com SECURITY DEFINER, bypassa RLS de audit_logs para inserção.
-- =============================================================

-- Função genérica: recebe TG_TABLE_NAME/TG_OP + linha old/new e grava row
create or replace function public.log_audit_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action       text;
  v_entity_type  text := tg_table_name;
  v_entity_id    text;
  v_org_id       uuid;
  v_prev         jsonb;
  v_new          jsonb;
begin
  -- Skip auditing writes triggered by service role bulk seeds
  -- (basic guard: no-op if auth.uid() is null AND op is INSERT — avoids
  -- flooding logs during migrations that seed via service role)
  if auth.uid() is null and tg_op = 'INSERT' then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    v_action := v_entity_type || '.created';
    v_new    := to_jsonb(new);
    v_entity_id := coalesce(new.id::text, null);
    v_org_id := (case when to_jsonb(new) ? 'organization_id' then (new.organization_id) else null end);
  elsif tg_op = 'UPDATE' then
    v_action := v_entity_type || '.updated';
    v_prev   := to_jsonb(old);
    v_new    := to_jsonb(new);
    v_entity_id := coalesce(new.id::text, null);
    v_org_id := (case when to_jsonb(new) ? 'organization_id' then (new.organization_id) else null end);
    -- Special case for status transitions on cases
    if v_entity_type = 'cases' and old.internal_status is distinct from new.internal_status then
      v_action := 'cases.status_changed';
    end if;
    -- Skip low-signal updates (updated_at only)
    if v_prev - 'updated_at' = v_new - 'updated_at' then
      return new;
    end if;
  elsif tg_op = 'DELETE' then
    v_action := v_entity_type || '.deleted';
    v_prev   := to_jsonb(old);
    v_entity_id := coalesce(old.id::text, null);
    v_org_id := (case when to_jsonb(old) ? 'organization_id' then (old.organization_id) else null end);
  end if;

  insert into public.audit_logs (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id,
    previous_data,
    new_data
  )
  values (
    v_org_id,
    auth.uid(),
    v_action,
    v_entity_type,
    v_entity_id,
    v_prev,
    v_new
  );

  return coalesce(new, old);
end;
$$;

grant execute on function public.log_audit_change() to authenticated, service_role;

-- ─── profiles: só UPDATE (INSERT feito só via bootstrap) ──────────
drop trigger if exists trg_audit_profiles on public.profiles;
create trigger trg_audit_profiles
after update on public.profiles
for each row execute function public.log_audit_change();

-- ─── cases: create/update/status_changed/delete ───────────────────
drop trigger if exists trg_audit_cases on public.cases;
create trigger trg_audit_cases
after insert or update or delete on public.cases
for each row execute function public.log_audit_change();

-- ─── case_files: upload / delete (metadata) ───────────────────────
drop trigger if exists trg_audit_case_files on public.case_files;
create trigger trg_audit_case_files
after insert or update or delete on public.case_files
for each row execute function public.log_audit_change();

-- ─── quotes: create / approve / reject / etc ──────────────────────
drop trigger if exists trg_audit_quotes on public.quotes;
create trigger trg_audit_quotes
after insert or update or delete on public.quotes
for each row execute function public.log_audit_change();

-- ─── deliveries: create / status changes ──────────────────────────
drop trigger if exists trg_audit_deliveries on public.deliveries;
create trigger trg_audit_deliveries
after insert or update or delete on public.deliveries
for each row execute function public.log_audit_change();

-- ─── planning_versions: versions + approval ───────────────────────
drop trigger if exists trg_audit_planning on public.planning_versions;
create trigger trg_audit_planning
after insert or update or delete on public.planning_versions
for each row execute function public.log_audit_change();

-- ─── clinics / dentists / leads: CRM writes ───────────────────────
drop trigger if exists trg_audit_clinics on public.clinics;
create trigger trg_audit_clinics
after insert or update or delete on public.clinics
for each row execute function public.log_audit_change();

drop trigger if exists trg_audit_dentists on public.dentists;
create trigger trg_audit_dentists
after insert or update or delete on public.dentists
for each row execute function public.log_audit_change();

drop trigger if exists trg_audit_leads on public.leads;
create trigger trg_audit_leads
after insert or update or delete on public.leads
for each row execute function public.log_audit_change();
