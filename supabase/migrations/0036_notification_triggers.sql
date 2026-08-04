-- =============================================================
-- 0036 · Notification triggers automáticos
-- Cria linhas em public.notifications baseadas em eventos de negócio.
-- SECURITY DEFINER — bypassa RLS mas cria notificação SOMENTE para
-- usuários da mesma organização e com relação legítima ao caso.
-- =============================================================

-- Helper: broadcast para todos os admins/super_admins da org
create or replace function public.notify_org_admins(
  p_org_id       uuid,
  p_type         text,
  p_title        text,
  p_message      text,
  p_action_url   text,
  p_case_id      uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (organization_id, user_id, case_id, type, title, message, action_url, channel, status)
  select p_org_id, p.id, p_case_id, p_type, p_title, p_message, p_action_url, 'in_app', 'pending'
  from public.profiles p
  where p.organization_id = p_org_id
    and p.role in ('super_admin', 'admin')
    and p.status = 'active';
end;
$$;

-- Helper: notifica um usuário específico
create or replace function public.notify_user(
  p_org_id       uuid,
  p_user_id      uuid,
  p_type         text,
  p_title        text,
  p_message      text,
  p_action_url   text,
  p_case_id      uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then return; end if;
  insert into public.notifications (organization_id, user_id, case_id, type, title, message, action_url, channel, status)
  values (p_org_id, p_user_id, p_case_id, p_type, p_title, p_message, p_action_url, 'in_app', 'pending');
end;
$$;

grant execute on function public.notify_org_admins(uuid, text, text, text, text, uuid) to authenticated, service_role;
grant execute on function public.notify_user(uuid, uuid, text, text, text, text, uuid) to authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════
-- CASES
-- ═══════════════════════════════════════════════════════════════

-- Novo caso submetido → notifica commercial_owner + admins
create or replace function public.notify_case_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_title text;
begin
  if tg_op = 'UPDATE'
     and old.internal_status = 'draft'
     and new.internal_status = 'submitted' then
    v_url := '/casos/' || new.id;
    v_title := 'Novo caso enviado: ' || new.case_number;

    -- Notifica commercial_owner (se existir e for diferente do autor)
    if new.commercial_owner_id is not null and new.commercial_owner_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) then
      perform public.notify_user(
        new.organization_id, new.commercial_owner_id,
        'case_submitted', v_title,
        new.title, v_url, new.id
      );
    end if;

    -- Notifica admins (excluindo o commercial_owner já notificado)
    insert into public.notifications (organization_id, user_id, case_id, type, title, message, action_url, channel, status)
    select new.organization_id, p.id, new.id, 'case_submitted', v_title, new.title, v_url, 'in_app', 'pending'
    from public.profiles p
    where p.organization_id = new.organization_id
      and p.role in ('super_admin', 'admin')
      and p.status = 'active'
      and p.id <> coalesce(new.commercial_owner_id, '00000000-0000-0000-0000-000000000000'::uuid)
      and p.id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  end if;

  -- Mudança de status genérica (não submitted) → notifica technical_owner + production_owner
  if tg_op = 'UPDATE'
     and old.internal_status is distinct from new.internal_status
     and not (old.internal_status = 'draft' and new.internal_status = 'submitted') then
    v_url := '/casos/' || new.id;
    v_title := new.case_number || ' · status alterado';

    if new.technical_owner_id is not null and new.technical_owner_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) then
      perform public.notify_user(
        new.organization_id, new.technical_owner_id,
        'case_status_changed', v_title,
        old.internal_status || ' → ' || new.internal_status,
        v_url, new.id
      );
    end if;
    if new.production_owner_id is not null
       and new.production_owner_id <> new.technical_owner_id
       and new.production_owner_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) then
      perform public.notify_user(
        new.organization_id, new.production_owner_id,
        'case_status_changed', v_title,
        old.internal_status || ' → ' || new.internal_status,
        v_url, new.id
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_case_status on public.cases;
create trigger trg_notify_case_status
after update of internal_status on public.cases
for each row execute function public.notify_case_submitted();

-- ═══════════════════════════════════════════════════════════════
-- CASE MESSAGES
-- ═══════════════════════════════════════════════════════════════
-- Nova mensagem visibility=dentist → notifica commercial_owner + technical_owner
-- (a menos que sejam o próprio autor)
create or replace function public.notify_case_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case record;
  v_url  text;
  v_title text;
begin
  if new.visibility <> 'dentist' then
    return new;
  end if;

  select id, case_number, title, commercial_owner_id, technical_owner_id
    into v_case
    from public.cases
    where id = new.case_id;

  if not found then return new; end if;

  v_url := '/casos/' || v_case.id;
  v_title := 'Nova mensagem · ' || v_case.case_number;

  if v_case.commercial_owner_id is not null and v_case.commercial_owner_id <> new.sender_id then
    perform public.notify_user(
      new.organization_id, v_case.commercial_owner_id,
      'case_message', v_title,
      left(new.message, 200), v_url, v_case.id
    );
  end if;
  if v_case.technical_owner_id is not null
     and v_case.technical_owner_id <> v_case.commercial_owner_id
     and v_case.technical_owner_id <> new.sender_id then
    perform public.notify_user(
      new.organization_id, v_case.technical_owner_id,
      'case_message', v_title,
      left(new.message, 200), v_url, v_case.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_case_message on public.case_messages;
create trigger trg_notify_case_message
after insert on public.case_messages
for each row execute function public.notify_case_message();

-- ═══════════════════════════════════════════════════════════════
-- QUOTES
-- ═══════════════════════════════════════════════════════════════
-- Aprovação de orçamento → notifica admins
create or replace function public.notify_quote_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case record;
begin
  if tg_op = 'UPDATE'
     and old.status <> 'approved'
     and new.status = 'approved' then

    select case_number, id into v_case from public.cases where id = new.case_id;

    perform public.notify_org_admins(
      new.organization_id,
      'quote_approved',
      'Orçamento aprovado · ' || coalesce(v_case.case_number, ''),
      new.quote_number || ' · v' || new.version_number || ' · R$ ' || new.total,
      '/casos/' || new.case_id,
      new.case_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_quote_approved on public.quotes;
create trigger trg_notify_quote_approved
after update of status on public.quotes
for each row execute function public.notify_quote_approved();

-- ═══════════════════════════════════════════════════════════════
-- DELIVERIES
-- ═══════════════════════════════════════════════════════════════
-- Marcar como entregue → notifica commercial_owner + admins
create or replace function public.notify_delivery_delivered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case record;
begin
  if tg_op = 'UPDATE'
     and old.status <> 'delivered'
     and new.status = 'delivered' then

    select case_number, commercial_owner_id into v_case
    from public.cases where id = new.case_id;

    if v_case.commercial_owner_id is not null
       and v_case.commercial_owner_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) then
      perform public.notify_user(
        new.organization_id, v_case.commercial_owner_id,
        'delivery_delivered',
        'Caso entregue · ' || coalesce(v_case.case_number, ''),
        coalesce(new.recipient_name, 'Recebedor não informado'),
        '/casos/' || new.case_id,
        new.case_id
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_delivery on public.deliveries;
create trigger trg_notify_delivery
after update of status on public.deliveries
for each row execute function public.notify_delivery_delivered();
