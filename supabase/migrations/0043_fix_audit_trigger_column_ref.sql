-- =============================================================
-- 0043 · Fix crítico do trigger `log_audit_change`
--
-- Bug em 0035: a função de trigger genérica referencia `old.internal_status`
-- diretamente. Como o mesmo trigger roda em `profiles` (que não tem essa
-- coluna), TODO UPDATE em profiles falha com:
--   record "old" has no field "internal_status"
--
-- Efeito prático: `loginAction` faz `UPDATE profiles SET last_login_at`,
-- o trigger dispara e a Server Action lança — usuário autentica no
-- Supabase mas não consegue entrar no HUB.
--
-- Fix: usar acesso via jsonb (`to_jsonb(old) ->> 'internal_status'`) para
-- que o nome só seja resolvido em runtime, depois do check `v_entity_type`.
-- =============================================================

create or replace function public.log_audit_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_type text := tg_table_name;
  v_action      text;
  v_prev        jsonb;
  v_new         jsonb;
  v_entity_id   text;
  v_org_id      uuid;
begin
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
    -- Status transition — resolve column via jsonb so tables without
    -- `internal_status` (e.g. profiles) don't blow up here.
    if v_entity_type = 'cases'
       and (v_prev ->> 'internal_status') is distinct from (v_new ->> 'internal_status') then
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
