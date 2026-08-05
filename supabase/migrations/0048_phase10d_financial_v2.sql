-- =============================================================
-- 0048 · Fase 10D · Financeiro v2
--
-- Sobre a base 0028 (invoices + payments operacionais):
--   • fin_categories       — receita/despesa (com árvore parent_id)
--   • fin_cost_centers     — centros de custo
--   • fin_accounts_payable — contas a pagar (fornecedor, categoria, CC)
--   • fin_commissions      — comissões por invoice/case
--   • fin_transactions     — livro-razão unificado (in/out)
--   • view v_finance_kpis  — KPIs consolidados
--   • view v_cash_flow_daily — fluxo diário 30d
--   • view v_dre_month     — DRE mensal simplificado
-- =============================================================

-- ─── enums ──────────────────────────────────────────────────
do $$ begin
  create type public.fin_category_kind as enum ('revenue', 'expense');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payable_status as enum (
    'pending', 'scheduled', 'paid', 'overdue', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.commission_status as enum (
    'pending', 'approved', 'paid', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.txn_kind as enum ('income', 'expense');
exception when duplicate_object then null; end $$;

-- ─── fin_categories ─────────────────────────────────────────
create table if not exists public.fin_categories (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  parent_id         uuid references public.fin_categories(id) on delete set null,
  kind              public.fin_category_kind not null,
  name              text not null,
  code              text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now()),
  unique (organization_id, kind, name)
);

create index if not exists fin_categories_org_kind_idx on public.fin_categories (organization_id, kind, is_active);

drop trigger if exists set_updated_at_fin_categories on public.fin_categories;
create trigger set_updated_at_fin_categories
before update on public.fin_categories
for each row execute function public.set_updated_at();

alter table public.fin_categories enable row level security;
alter table public.fin_categories force row level security;

drop policy if exists "fin_cat_select" on public.fin_categories;
create policy "fin_cat_select"
on public.fin_categories for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and (public.is_internal_user())
);

drop policy if exists "fin_cat_write" on public.fin_categories;
create policy "fin_cat_write"
on public.fin_categories for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','finance')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','finance')
);

-- ─── fin_cost_centers ───────────────────────────────────────
create table if not exists public.fin_cost_centers (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  code              text,
  name              text not null,
  description       text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now()),
  unique (organization_id, name)
);

create index if not exists fin_cc_org_idx on public.fin_cost_centers (organization_id, is_active);

drop trigger if exists set_updated_at_fin_cost_centers on public.fin_cost_centers;
create trigger set_updated_at_fin_cost_centers
before update on public.fin_cost_centers
for each row execute function public.set_updated_at();

alter table public.fin_cost_centers enable row level security;
alter table public.fin_cost_centers force row level security;

drop policy if exists "fin_cc_select" on public.fin_cost_centers;
create policy "fin_cc_select"
on public.fin_cost_centers for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_internal_user()
);

drop policy if exists "fin_cc_write" on public.fin_cost_centers;
create policy "fin_cc_write"
on public.fin_cost_centers for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','finance')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','finance')
);

-- ─── fin_accounts_payable ───────────────────────────────────
create table if not exists public.fin_accounts_payable (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  supplier_name     text not null,
  description       text,
  category_id       uuid references public.fin_categories(id) on delete set null,
  cost_center_id    uuid references public.fin_cost_centers(id) on delete set null,
  amount            numeric(12,2) not null,
  due_date          date not null,
  paid_at           timestamptz,
  paid_amount       numeric(12,2),
  method            public.payment_method,
  status            public.payable_status not null default 'pending',
  external_reference text,
  notes             text,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now())
);

create index if not exists fin_ap_org_status_idx on public.fin_accounts_payable (organization_id, status, due_date);
create index if not exists fin_ap_due_idx on public.fin_accounts_payable (due_date) where status in ('pending','scheduled');

drop trigger if exists set_updated_at_fin_accounts_payable on public.fin_accounts_payable;
create trigger set_updated_at_fin_accounts_payable
before update on public.fin_accounts_payable
for each row execute function public.set_updated_at();

alter table public.fin_accounts_payable enable row level security;
alter table public.fin_accounts_payable force row level security;

drop policy if exists "fin_ap_select" on public.fin_accounts_payable;
create policy "fin_ap_select"
on public.fin_accounts_payable for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','finance')
);

drop policy if exists "fin_ap_write" on public.fin_accounts_payable;
create policy "fin_ap_write"
on public.fin_accounts_payable for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','finance')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','finance')
);

-- ─── fin_commissions ────────────────────────────────────────
create table if not exists public.fin_commissions (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  beneficiary_id    uuid not null references public.profiles(id) on delete cascade,
  invoice_id        uuid references public.invoices(id) on delete set null,
  case_id           uuid references public.cases(id) on delete set null,
  base_amount       numeric(12,2) not null,
  percentage        numeric(5,2) not null default 0,
  amount            numeric(12,2) not null,
  reference_month   date,             -- Ex.: '2026-08-01' — mês de competência
  status            public.commission_status not null default 'pending',
  approved_at       timestamptz,
  paid_at           timestamptz,
  notes             text,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now())
);

create index if not exists fin_comm_org_status_idx on public.fin_commissions (organization_id, status);
create index if not exists fin_comm_beneficiary_idx on public.fin_commissions (beneficiary_id, reference_month desc);
create index if not exists fin_comm_invoice_idx on public.fin_commissions (invoice_id) where invoice_id is not null;

drop trigger if exists set_updated_at_fin_commissions on public.fin_commissions;
create trigger set_updated_at_fin_commissions
before update on public.fin_commissions
for each row execute function public.set_updated_at();

alter table public.fin_commissions enable row level security;
alter table public.fin_commissions force row level security;

drop policy if exists "fin_comm_select" on public.fin_commissions;
create policy "fin_comm_select"
on public.fin_commissions for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and (
    beneficiary_id = auth.uid()
    or public.current_user_role() in ('super_admin','admin','finance')
  )
);

drop policy if exists "fin_comm_write" on public.fin_commissions;
create policy "fin_comm_write"
on public.fin_commissions for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','finance')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','finance')
);

-- ─── fin_transactions (livro-razão unificado) ──────────────
create table if not exists public.fin_transactions (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  kind              public.txn_kind not null,
  amount            numeric(12,2) not null,
  txn_date          date not null default (timezone('utc', now())::date),
  category_id       uuid references public.fin_categories(id) on delete set null,
  cost_center_id    uuid references public.fin_cost_centers(id) on delete set null,
  method            public.payment_method,
  source_type       text,             -- 'invoice_payment' | 'payable' | 'commission' | 'manual'
  source_id         uuid,             -- id da fonte (invoice_payment.id, payable.id, ...)
  description       text,
  notes             text,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default timezone('utc', now())
);

create index if not exists fin_txn_org_date_idx on public.fin_transactions (organization_id, txn_date desc);
create index if not exists fin_txn_kind_date_idx on public.fin_transactions (organization_id, kind, txn_date desc);
create index if not exists fin_txn_source_idx on public.fin_transactions (source_type, source_id);

alter table public.fin_transactions enable row level security;
alter table public.fin_transactions force row level security;

drop policy if exists "fin_txn_select" on public.fin_transactions;
create policy "fin_txn_select"
on public.fin_transactions for select to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','finance')
);

drop policy if exists "fin_txn_write" on public.fin_transactions;
create policy "fin_txn_write"
on public.fin_transactions for all to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','finance')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('super_admin','admin','finance')
);

-- ─── RPC: pay_payable ───────────────────────────────────────
-- Marca conta como paga e cria transação
create or replace function public.pay_payable(
  p_payable_id  uuid,
  p_paid_amount numeric,
  p_method      public.payment_method,
  p_notes       text default null
)
returns public.fin_accounts_payable
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payable public.fin_accounts_payable;
begin
  select * into v_payable from public.fin_accounts_payable where id = p_payable_id for update;
  if v_payable.id is null then raise exception 'payable not found'; end if;
  if v_payable.status = 'paid' then raise exception 'already paid'; end if;

  update public.fin_accounts_payable
    set status = 'paid',
        paid_at = timezone('utc', now()),
        paid_amount = p_paid_amount,
        method = p_method,
        notes = coalesce(p_notes, notes)
    where id = p_payable_id returning * into v_payable;

  insert into public.fin_transactions (
    organization_id, kind, amount, category_id, cost_center_id, method,
    source_type, source_id, description, created_by
  ) values (
    v_payable.organization_id, 'expense', p_paid_amount,
    v_payable.category_id, v_payable.cost_center_id, p_method,
    'payable', v_payable.id,
    'Pagto: ' || v_payable.supplier_name,
    auth.uid()
  );

  return v_payable;
end;
$$;

grant execute on function public.pay_payable(uuid, numeric, public.payment_method, text) to authenticated;

-- ─── RPC: register_invoice_payment_txn ──────────────────────
-- Ao registrar pagamento em invoice, gera transação income
create or replace function public.register_invoice_payment_txn(
  p_payment_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_txn_id uuid;
  v_payment public.payments;
  v_invoice public.invoices;
begin
  select * into v_payment from public.payments where id = p_payment_id;
  if v_payment.id is null then raise exception 'payment not found'; end if;

  select * into v_invoice from public.invoices where id = v_payment.invoice_id;
  if v_invoice.id is null then raise exception 'invoice not found'; end if;

  -- Evita duplicidade
  select id into v_txn_id from public.fin_transactions
    where source_type = 'invoice_payment' and source_id = p_payment_id
    limit 1;
  if v_txn_id is not null then return v_txn_id; end if;

  insert into public.fin_transactions (
    organization_id, kind, amount, method, source_type, source_id,
    description, txn_date, created_by
  ) values (
    v_payment.organization_id, 'income', v_payment.amount, v_payment.method,
    'invoice_payment', v_payment.id,
    'Recebimento fatura ' || v_invoice.invoice_number,
    coalesce(v_payment.paid_at::date, current_date),
    auth.uid()
  ) returning id into v_txn_id;

  return v_txn_id;
end;
$$;

grant execute on function public.register_invoice_payment_txn(uuid) to authenticated;

-- ─── view: KPIs financeiros ─────────────────────────────────
create or replace view public.v_finance_kpis
with (security_invoker = true)
as
select
  organization_id,
  coalesce(sum(amount) filter (where kind = 'income'
    and txn_date > current_date - interval '30 days'), 0)      as income_30d,
  coalesce(sum(amount) filter (where kind = 'expense'
    and txn_date > current_date - interval '30 days'), 0)      as expense_30d,
  coalesce(sum(amount) filter (where kind = 'income'
    and date_trunc('month', txn_date) = date_trunc('month', current_date)), 0) as income_mtd,
  coalesce(sum(amount) filter (where kind = 'expense'
    and date_trunc('month', txn_date) = date_trunc('month', current_date)), 0) as expense_mtd
from public.fin_transactions
group by organization_id;

grant select on public.v_finance_kpis to authenticated;

-- ─── view: fluxo de caixa diário 30d ───────────────────────
create or replace view public.v_cash_flow_daily
with (security_invoker = true)
as
select
  organization_id,
  txn_date,
  coalesce(sum(amount) filter (where kind = 'income'), 0) as income,
  coalesce(sum(amount) filter (where kind = 'expense'), 0) as expense,
  coalesce(sum(amount) filter (where kind = 'income'), 0)
   - coalesce(sum(amount) filter (where kind = 'expense'), 0) as net
from public.fin_transactions
where txn_date > current_date - interval '90 days'
group by organization_id, txn_date;

grant select on public.v_cash_flow_daily to authenticated;

-- ─── view: DRE mensal simplificado ─────────────────────────
create or replace view public.v_dre_month
with (security_invoker = true)
as
select
  t.organization_id,
  date_trunc('month', t.txn_date) as month,
  t.kind,
  coalesce(c.name, 'Sem categoria') as category,
  sum(t.amount)                    as total
from public.fin_transactions t
left join public.fin_categories c on c.id = t.category_id
where t.txn_date > current_date - interval '12 months'
group by t.organization_id, date_trunc('month', t.txn_date), t.kind, c.name;

grant select on public.v_dre_month to authenticated;

-- ─── view: contas a pagar em aberto ────────────────────────
create or replace view public.v_payables_open
with (security_invoker = true)
as
select
  organization_id,
  count(*)                          as total_count,
  count(*) filter (where due_date < current_date) as overdue_count,
  coalesce(sum(amount), 0)          as total_amount,
  coalesce(sum(amount) filter (where due_date < current_date), 0) as overdue_amount
from public.fin_accounts_payable
where status in ('pending','scheduled','overdue')
group by organization_id;

grant select on public.v_payables_open to authenticated;

-- ─── Auto-marca payables overdue ────────────────────────────
create or replace function public.mark_overdue_payables()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_count int;
begin
  update public.fin_accounts_payable
    set status = 'overdue'
    where status in ('pending','scheduled')
      and due_date < current_date;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.mark_overdue_payables() to authenticated;
