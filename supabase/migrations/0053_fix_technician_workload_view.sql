-- =============================================================
-- 0053 · Fix v_technician_workload · p.name → p.full_name
--
-- Bug pré-existente na migration 0045:
--   • SELECT usa `p.full_name as technician_name`  (correto)
--   • GROUP BY referencia `p.name`                 (coluna inexistente)
--
-- Postgres aceita a view no CREATE porque valida apenas sintaxe;
-- só quebra em runtime, no primeiro SELECT * FROM v_technician_workload.
-- Isso quebrava /tecnicos com 500 assim que a página tentava carregar
-- o workload dos técnicos.
--
-- Recria a view com o GROUP BY correto (usa p.full_name).
-- =============================================================

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
group by t.id, t.organization_id, t.profile_id, p.full_name, t.specialty, t.status;

grant select on public.v_technician_workload to authenticated;
