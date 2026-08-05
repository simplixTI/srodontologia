-- =============================================================
-- 0050 · Fase 10F · BI/Relatórios + Search Global + Automações
--
-- Views para dashboards e relatórios pré-fabricados:
--   • v_report_cases_by_status
--   • v_report_cases_health_distribution
--   • v_report_production_throughput_daily
--   • v_report_production_stage_avg_time
--   • v_report_technician_productivity
--   • v_report_qc_pass_rate_daily
--   • v_report_deliveries_on_time
--   • v_report_deliveries_by_carrier
--   • v_report_finance_revenue_by_month
--   • v_report_finance_top_expense_categories
--   • v_report_finance_commission_paid
--   • v_report_dentist_activity
--
-- Extensão do índice de busca para novas entidades:
--   • Auto-inclui production_cards, planning_versions, calendar_events,
--     fin_accounts_payable via handler no worker (adiciona linhas em
--     search_index existente)
-- =============================================================

-- ─── Report views (todos com security_invoker) ─────────────
create or replace view public.v_report_cases_by_status
with (security_invoker = true)
as
select
  organization_id,
  internal_status,
  count(*)                                                   as total,
  count(*) filter (where created_at > current_date - interval '30 days') as recent_30d
from public.cases
group by organization_id, internal_status;

grant select on public.v_report_cases_by_status to authenticated;

create or replace view public.v_report_cases_health_distribution
with (security_invoker = true)
as
select
  organization_id,
  case
    when health_score >= 80 then 'high'
    when health_score >= 50 then 'medium'
    when health_score is not null then 'low'
    else 'unknown'
  end                                                        as tier,
  count(*)                                                   as total
from public.cases
group by organization_id, tier;

grant select on public.v_report_cases_health_distribution to authenticated;

create or replace view public.v_report_production_throughput_daily
with (security_invoker = true)
as
select
  organization_id,
  date_trunc('day', occurred_at)                              as day,
  count(*)                                                    as transitions,
  count(*) filter (where is_rework)                           as rework_transitions
from public.production_events
where occurred_at > current_date - interval '90 days'
group by organization_id, date_trunc('day', occurred_at)
order by day desc;

grant select on public.v_report_production_throughput_daily to authenticated;

create or replace view public.v_report_production_stage_avg_time
with (security_invoker = true)
as
select
  organization_id,
  to_stage_id                                                 as stage_id,
  count(*)                                                    as sample_size,
  avg(duration_ms) / 1000.0                                   as avg_duration_seconds
from public.production_events
where duration_ms > 0
group by organization_id, to_stage_id;

grant select on public.v_report_production_stage_avg_time to authenticated;

create or replace view public.v_report_technician_productivity
with (security_invoker = true)
as
select
  t.organization_id,
  t.id                                                        as technician_id,
  p.full_name                                                 as technician_name,
  count(distinct c.id) filter (where c.completed_at is not null) as completed_cards,
  count(distinct c.id) filter (where c.completed_at is null)     as active_cards,
  coalesce(sum(c.rework_count), 0)                            as total_rework,
  coalesce(avg(c.total_time_ms), 0) / 3600000.0               as avg_time_hours
from public.technicians t
join public.profiles p on p.id = t.profile_id
left join public.production_cards c on c.assignee_id = t.profile_id
                                    and c.organization_id = t.organization_id
group by t.organization_id, t.id, p.full_name;

grant select on public.v_report_technician_productivity to authenticated;

create or replace view public.v_report_qc_pass_rate_daily
with (security_invoker = true)
as
select
  organization_id,
  date_trunc('day', finished_at)                              as day,
  count(*)                                                    as total,
  count(*) filter (where status = 'passed')                   as passed,
  count(*) filter (where status = 'failed')                   as failed,
  round(
    100.0 * count(*) filter (where status = 'passed')
    / nullif(count(*) filter (where status in ('passed','failed')), 0), 2
  )                                                           as pass_rate
from public.qc_inspections
where finished_at > current_date - interval '90 days'
  and finished_at is not null
group by organization_id, date_trunc('day', finished_at)
order by day desc;

grant select on public.v_report_qc_pass_rate_daily to authenticated;

create or replace view public.v_report_deliveries_on_time
with (security_invoker = true)
as
select
  organization_id,
  count(*)                                                    as total,
  count(*) filter (where status = 'delivered'
    and delivered_at <= estimated_delivery_at)                as on_time,
  count(*) filter (where status = 'delivered'
    and delivered_at > estimated_delivery_at)                 as late,
  round(
    100.0 * count(*) filter (where status = 'delivered'
      and delivered_at <= estimated_delivery_at)
    / nullif(count(*) filter (where status = 'delivered' and estimated_delivery_at is not null), 0),
    2
  )                                                           as on_time_rate
from public.deliveries
where delivered_at > current_date - interval '90 days'
   or (status <> 'delivered' and created_at > current_date - interval '90 days')
group by organization_id;

grant select on public.v_report_deliveries_on_time to authenticated;

create or replace view public.v_report_deliveries_by_carrier
with (security_invoker = true)
as
select
  d.organization_id,
  coalesce(dc.name, d.carrier)                                as carrier_name,
  count(*)                                                    as total,
  count(*) filter (where d.status = 'delivered')              as delivered,
  count(*) filter (where d.status in ('pending','dispatched','in_transit')) as open
from public.deliveries d
left join public.delivery_carriers dc on dc.id = d.carrier_id
where d.created_at > current_date - interval '90 days'
group by d.organization_id, coalesce(dc.name, d.carrier);

grant select on public.v_report_deliveries_by_carrier to authenticated;

create or replace view public.v_report_finance_revenue_by_month
with (security_invoker = true)
as
select
  organization_id,
  date_trunc('month', txn_date)                               as month,
  coalesce(sum(amount) filter (where kind = 'income'), 0)     as income,
  coalesce(sum(amount) filter (where kind = 'expense'), 0)    as expense,
  coalesce(sum(amount) filter (where kind = 'income'), 0)
    - coalesce(sum(amount) filter (where kind = 'expense'), 0) as net
from public.fin_transactions
where txn_date > current_date - interval '12 months'
group by organization_id, date_trunc('month', txn_date)
order by month desc;

grant select on public.v_report_finance_revenue_by_month to authenticated;

create or replace view public.v_report_finance_top_expense_categories
with (security_invoker = true)
as
select
  t.organization_id,
  coalesce(c.name, 'Sem categoria')                           as category,
  sum(t.amount)                                               as total,
  count(*)                                                    as count
from public.fin_transactions t
left join public.fin_categories c on c.id = t.category_id
where t.kind = 'expense'
  and t.txn_date > current_date - interval '90 days'
group by t.organization_id, coalesce(c.name, 'Sem categoria')
order by total desc;

grant select on public.v_report_finance_top_expense_categories to authenticated;

create or replace view public.v_report_finance_commission_paid
with (security_invoker = true)
as
select
  fc.organization_id,
  fc.beneficiary_id,
  p.full_name                                                 as beneficiary_name,
  date_trunc('month', fc.paid_at)                             as month,
  coalesce(sum(fc.amount), 0)                                 as total_paid
from public.fin_commissions fc
join public.profiles p on p.id = fc.beneficiary_id
where fc.status = 'paid' and fc.paid_at is not null
group by fc.organization_id, fc.beneficiary_id, p.full_name, date_trunc('month', fc.paid_at)
order by month desc;

grant select on public.v_report_finance_commission_paid to authenticated;

create or replace view public.v_report_dentist_activity
with (security_invoker = true)
as
select
  d.organization_id,
  d.id                                                        as dentist_id,
  d.full_name                                                 as dentist_name,
  count(distinct c.id)                                        as total_cases,
  count(distinct c.id) filter (where c.created_at > current_date - interval '30 days') as cases_30d,
  count(distinct c.id) filter (where c.internal_status = 'delivered') as delivered
from public.dentists d
left join public.cases c on c.dentist_id = d.id
group by d.organization_id, d.id, d.full_name;

grant select on public.v_report_dentist_activity to authenticated;

-- ─── search_index: expandido para novas entidades ──────────
-- A tabela search_index já existe (0038). Aqui apenas garantimos
-- que aceite os novos entity_kind via CHECK (que é tipo text).
-- Handlers de eventos indexam via app (services/search-writer.ts).

-- Fim.
