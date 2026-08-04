-- =============================================================
-- 0033 · Demo seed (clearly marked DEMO, safe to keep/remove)
-- 2 clinics + 3 dentists (linked to Aline as commercial_owner)
-- =============================================================

do $$
declare
  org_id constant uuid := '00000000-0000-0000-0000-000000000001';
  aline_profile_id uuid;

  clinic_bh_id  uuid;
  clinic_nl_id  uuid;
  dent1_id      uuid;
  dent2_id      uuid;
  dent3_id      uuid;
begin
  select id into aline_profile_id
  from public.profiles
  where email = 'alinebabo@yahoo.com.br'
  limit 1;

  -- Clinics
  insert into public.clinics (organization_id, trade_name, legal_name, email, phone, whatsapp, city, state, active, notes)
  values
    (org_id, 'DEMO · Clínica Odontocenter BH', 'Odontocenter Belo Horizonte Ltda',
     'contato@odontocenter-bh.demo', '+553133330000', '+553199990000',
     'Belo Horizonte', 'MG', true, 'Cadastro de demonstração — pode remover.')
  on conflict do nothing
  returning id into clinic_bh_id;

  insert into public.clinics (organization_id, trade_name, legal_name, email, phone, whatsapp, city, state, active, notes)
  values
    (org_id, 'DEMO · Clínica Sorriso Nova Lima', 'Sorriso Nova Lima Ltda',
     'contato@sorrisonovalima.demo', '+553133331111', '+553199991111',
     'Nova Lima', 'MG', true, 'Cadastro de demonstração — pode remover.')
  on conflict do nothing
  returning id into clinic_nl_id;

  -- Fallback lookups if clinics already existed
  if clinic_bh_id is null then
    select id into clinic_bh_id from public.clinics
    where organization_id = org_id and trade_name = 'DEMO · Clínica Odontocenter BH' limit 1;
  end if;
  if clinic_nl_id is null then
    select id into clinic_nl_id from public.clinics
    where organization_id = org_id and trade_name = 'DEMO · Clínica Sorriso Nova Lima' limit 1;
  end if;

  -- Dentists (all pointing to Aline as commercial_owner)
  insert into public.dentists
    (organization_id, primary_clinic_id, full_name, cro_number, cro_state, specialty,
     email, phone, whatsapp, city, state, source, commercial_owner_id, customer_status, notes)
  values
    (org_id, clinic_bh_id, 'DEMO · Dr. Renato Machado', '12345', 'MG', 'Implantodontia',
     'renato.demo@srodontologiadigital.com.br', '+553199001111', '+553199001111',
     'Belo Horizonte', 'MG', 'referral', aline_profile_id, 'active_customer',
     'Dentista de demonstração — pode remover.')
  on conflict do nothing
  returning id into dent1_id;

  insert into public.dentists
    (organization_id, primary_clinic_id, full_name, cro_number, cro_state, specialty,
     email, phone, whatsapp, city, state, source, commercial_owner_id, customer_status, notes)
  values
    (org_id, clinic_nl_id, 'DEMO · Dra. Ana Paula Souza', '54321', 'MG', 'Prótese',
     'ana.demo@srodontologiadigital.com.br', '+553199002222', '+553199002222',
     'Nova Lima', 'MG', 'instagram', aline_profile_id, 'first_case',
     'Dentista de demonstração — pode remover.')
  on conflict do nothing
  returning id into dent2_id;

  insert into public.dentists
    (organization_id, primary_clinic_id, full_name, cro_number, cro_state, specialty,
     email, phone, whatsapp, city, state, source, commercial_owner_id, customer_status, notes)
  values
    (org_id, clinic_bh_id, 'DEMO · Dr. Lucas Freitas', '67890', 'MG', 'Cirurgia',
     'lucas.demo@srodontologiadigital.com.br', '+553199003333', '+553199003333',
     'Belo Horizonte', 'MG', 'event', aline_profile_id, 'presentation_scheduled',
     'Dentista de demonstração — pode remover.')
  on conflict do nothing
  returning id into dent3_id;

  -- Link many-to-many
  if dent1_id is not null and clinic_bh_id is not null then
    insert into public.clinic_dentists (organization_id, clinic_id, dentist_id, is_primary, active)
    values (org_id, clinic_bh_id, dent1_id, true, true)
    on conflict do nothing;
  end if;
  if dent2_id is not null and clinic_nl_id is not null then
    insert into public.clinic_dentists (organization_id, clinic_id, dentist_id, is_primary, active)
    values (org_id, clinic_nl_id, dent2_id, true, true)
    on conflict do nothing;
  end if;
  if dent3_id is not null and clinic_bh_id is not null then
    insert into public.clinic_dentists (organization_id, clinic_id, dentist_id, is_primary, active)
    values (org_id, clinic_bh_id, dent3_id, true, true)
    on conflict do nothing;
  end if;

  -- 1 sample lead in the pipeline
  insert into public.leads
    (organization_id, full_name, clinic_name, cro_number, cro_state, specialty,
     email, phone, whatsapp, city, state, source, pipeline_stage, estimated_value,
     commercial_owner_id, notes)
  values
    (org_id, 'DEMO · Dra. Fernanda Lima', 'Consultório Autônomo',
     '99999', 'MG', 'Estética',
     'fernanda.demo@example.com', '+553199004444', '+553199004444',
     'Contagem', 'MG', 'instagram', 'contacted', 15000,
     aline_profile_id, 'Lead de demonstração — pode remover.')
  on conflict do nothing;
end $$;
