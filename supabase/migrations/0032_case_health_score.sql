-- =============================================================
-- 0032 · Case Health Score (real computation)
-- Weights (aligned with the Phase 2B prompt):
--   20% identification of the case (title, dentist, clinic, patient)
--   20% clinical info (description, teeth_regions, requested_delivery_date)
--   50% required checklist items
--   10% material + shade + estimated_delivery_date
-- =============================================================

create or replace function public.calculate_case_health_score(p_case_id uuid)
returns table (
  score               int,
  missing_required    int,
  total_required      int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case                 record;
  v_id_score             numeric := 0;
  v_clin_score           numeric := 0;
  v_check_score          numeric := 0;
  v_extra_score          numeric := 0;
  v_required_count       int := 0;
  v_required_completed   int := 0;
  v_final                int;
begin
  select id, title, dentist_id, clinic_id, patient_id,
         clinical_description, teeth_regions, requested_delivery_date,
         material, shade, estimated_delivery_date
    into v_case
    from public.cases
   where id = p_case_id;

  if v_case.id is null then
    return query select 0, 0, 0;
    return;
  end if;

  -- 20% identification (5 subfields, each 4 pts)
  if v_case.title is not null and length(trim(v_case.title)) > 0 then v_id_score := v_id_score + 4; end if;
  if v_case.dentist_id is not null                                 then v_id_score := v_id_score + 4; end if;
  if v_case.clinic_id  is not null                                 then v_id_score := v_id_score + 4; end if;
  if v_case.patient_id is not null                                 then v_id_score := v_id_score + 4; end if;
  -- last 4 pts: dentist + patient combined presence
  if v_case.dentist_id is not null and v_case.patient_id is not null then v_id_score := v_id_score + 4; end if;

  -- 20% clinical info
  if v_case.clinical_description is not null and length(trim(v_case.clinical_description)) > 20 then
    v_clin_score := v_clin_score + 10;
  elsif v_case.clinical_description is not null and length(trim(v_case.clinical_description)) > 0 then
    v_clin_score := v_clin_score + 4;
  end if;
  if v_case.teeth_regions is not null and array_length(v_case.teeth_regions, 1) > 0 then v_clin_score := v_clin_score + 5; end if;
  if v_case.requested_delivery_date is not null                                     then v_clin_score := v_clin_score + 5; end if;

  -- 50% required checklist items (proportional)
  select
    count(*) filter (where required_snapshot),
    count(*) filter (where required_snapshot and completed)
      into v_required_count, v_required_completed
  from public.case_checklist_items
  where case_id = p_case_id;

  if v_required_count > 0 then
    v_check_score := (v_required_completed::numeric / v_required_count::numeric) * 50;
  else
    v_check_score := 50;  -- nothing required = full mark for this dimension
  end if;

  -- 10% extras
  if v_case.material is not null and length(trim(v_case.material)) > 0 then v_extra_score := v_extra_score + 3; end if;
  if v_case.shade    is not null and length(trim(v_case.shade)) > 0    then v_extra_score := v_extra_score + 3; end if;
  if v_case.estimated_delivery_date is not null                        then v_extra_score := v_extra_score + 4; end if;

  v_final := least(100, greatest(0, round(v_id_score + v_clin_score + v_check_score + v_extra_score)::int));

  return query
  select v_final, greatest(0, v_required_count - v_required_completed), v_required_count;
end;
$$;

grant execute on function public.calculate_case_health_score(uuid) to authenticated, service_role;

-- Refresh helper: writes score + missing_required back to the case
create or replace function public.refresh_case_health_score(p_case_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.calculate_case_health_score(p_case_id);
  update public.cases
     set health_score = r.score,
         missing_required_items_count = r.missing_required
   where id = p_case_id;
end;
$$;

grant execute on function public.refresh_case_health_score(uuid) to authenticated, service_role;

-- Triggers to auto-refresh on checklist / files / case edits
create or replace function public.trg_refresh_health_from_checklist()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_case_health_score(coalesce(new.case_id, old.case_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_refresh_health_ci on public.case_checklist_items;
create trigger trg_refresh_health_ci
after insert or update or delete on public.case_checklist_items
for each row execute function public.trg_refresh_health_from_checklist();

drop trigger if exists trg_refresh_health_cf on public.case_files;
create trigger trg_refresh_health_cf
after insert or update or delete on public.case_files
for each row execute function public.trg_refresh_health_from_checklist();

create or replace function public.trg_refresh_health_from_case()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_case_health_score(new.id);
  return new;
end;
$$;

drop trigger if exists trg_refresh_health_on_case on public.cases;
create trigger trg_refresh_health_on_case
after insert or update of title, dentist_id, clinic_id, patient_id,
                          clinical_description, teeth_regions, requested_delivery_date,
                          material, shade, estimated_delivery_date
on public.cases
for each row execute function public.trg_refresh_health_from_case();
