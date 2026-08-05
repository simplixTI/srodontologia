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
