-- =============================================================
-- 0014 · Seed · Default case types + checklists for SR Digital
-- Idempotent. Aline can freely edit / add / remove afterwards.
-- =============================================================

do $$
declare
  org_id constant uuid := '00000000-0000-0000-0000-000000000001';

  protocolo_id uuid;
  coroa_id     uuid;
  guia_id      uuid;
  faceta_id    uuid;
  laminado_id  uuid;
  modelo_id    uuid;
begin
  -- Upsert case types
  insert into public.case_types (organization_id, code, name, description, icon, sort_order)
  values
    (org_id, 'PROTOCOLO_IMPLANTE', 'Protocolo sobre Implante',
      'Reabilitação total ou parcial sobre implantes (protocolo, all-on-X).',
      'Layers3', 10),
    (org_id, 'COROA_UNITARIA', 'Coroa Unitária',
      'Coroa cerâmica ou zircônia sobre implante ou dente natural.',
      'Circle', 20),
    (org_id, 'GUIA_CIRURGICO', 'Guia Cirúrgico',
      'Guia impresso para cirurgia guiada de implantes.',
      'Route', 30),
    (org_id, 'FACETA', 'Faceta',
      'Facetas cerâmicas ou compostas para estética anterior.',
      'Sparkles', 40),
    (org_id, 'LAMINADO', 'Laminado',
      'Laminados cerâmicos ultra-finos.',
      'Layers', 50),
    (org_id, 'MODELO_IMPRESSO', 'Modelo Impresso',
      'Modelos de trabalho, provisórios ou estudo em resina.',
      'Boxes', 60)
  on conflict (organization_id, code) do update
    set name        = excluded.name,
        description = excluded.description,
        icon        = excluded.icon,
        sort_order  = excluded.sort_order;

  -- Capture ids
  select id into protocolo_id from public.case_types where organization_id = org_id and code = 'PROTOCOLO_IMPLANTE';
  select id into coroa_id     from public.case_types where organization_id = org_id and code = 'COROA_UNITARIA';
  select id into guia_id      from public.case_types where organization_id = org_id and code = 'GUIA_CIRURGICO';
  select id into faceta_id    from public.case_types where organization_id = org_id and code = 'FACETA';
  select id into laminado_id  from public.case_types where organization_id = org_id and code = 'LAMINADO';
  select id into modelo_id    from public.case_types where organization_id = org_id and code = 'MODELO_IMPRESSO';

  -- ─── PROTOCOLO SOBRE IMPLANTE ────────────────────────────────
  insert into public.case_checklist_templates
    (organization_id, case_type_id, code, title, description, category, required, sort_order, accepted_file_types, minimum_files, maximum_files)
  values
    (org_id, protocolo_id, 'STL_SUPERIOR',       'STL Superior',        'Escaneamento intraoral da arcada superior.', 'stl',                true, 10, '{stl,obj}', 1, 3),
    (org_id, protocolo_id, 'STL_INFERIOR',       'STL Inferior',        'Escaneamento intraoral da arcada inferior.', 'stl',                true, 20, '{stl,obj}', 1, 3),
    (org_id, protocolo_id, 'REGISTRO_MORDIDA',   'Registro de Mordida', 'Registro oclusal em STL ou foto.',           'bite_registration',  true, 30, '{stl,obj,jpg,jpeg,png}', 1, 2),
    (org_id, protocolo_id, 'TOMOGRAFIA_DICOM',   'Tomografia DICOM',    'Arquivo DICOM (pode ser um .zip).',           'dicom_tomography',   true, 40, '{dcm,dicom,zip}', 1, 1),
    (org_id, protocolo_id, 'FOTO_FRONTAL',       'Foto Frontal',        'Foto frontal do sorriso.',                    'extraoral_photo',    true, 50, '{jpg,jpeg,png,heic,webp}', 1, 1),
    (org_id, protocolo_id, 'FOTO_SORRISO',       'Foto Sorriso',        'Sorriso amplo mostrando dentes.',             'extraoral_photo',    true, 60, '{jpg,jpeg,png,heic,webp}', 1, 1),
    (org_id, protocolo_id, 'FOTO_LATERAL_DIR',   'Foto Lateral Direita','Perfil direito.',                             'extraoral_photo',    true, 70, '{jpg,jpeg,png,heic,webp}', 1, 1),
    (org_id, protocolo_id, 'FOTO_LATERAL_ESQ',   'Foto Lateral Esquerda','Perfil esquerdo.',                           'extraoral_photo',    true, 80, '{jpg,jpeg,png,heic,webp}', 1, 1),
    (org_id, protocolo_id, 'FOTO_OCLUSAL_SUP',   'Foto Oclusal Superior','Vista oclusal da arcada superior.',          'intraoral_photo',    true, 90, '{jpg,jpeg,png,heic,webp}', 1, 1),
    (org_id, protocolo_id, 'FOTO_OCLUSAL_INF',   'Foto Oclusal Inferior','Vista oclusal da arcada inferior.',          'intraoral_photo',    true, 100,'{jpg,jpeg,png,heic,webp}', 1, 1),
    (org_id, protocolo_id, 'COR_DENTE',          'Cor do Dente',        'Escala de cor (ex.: A2, A3.5).',              'shade',              true, 110,'{}', 0, 0),
    (org_id, protocolo_id, 'MATERIAL',           'Material Desejado',   'Zircônia, PMMA, dissilicato etc.',            'material_spec',      true, 120,'{}', 0, 0),
    (org_id, protocolo_id, 'OBSERVACOES',        'Observações Clínicas','Notas do dentista sobre o caso.',             'notes',              true, 130,'{}', 0, 0)
  on conflict do nothing;

  -- ─── COROA UNITÁRIA ──────────────────────────────────────────
  insert into public.case_checklist_templates
    (organization_id, case_type_id, code, title, description, category, required, sort_order, accepted_file_types, minimum_files, maximum_files)
  values
    (org_id, coroa_id, 'STL',           'STL',           'Escaneamento do elemento e antagonista.',   'stl',              true, 10, '{stl,obj}', 1, 3),
    (org_id, coroa_id, 'FOTO_FRONTAL',  'Foto Frontal',  'Foto do elemento em vista frontal.',        'intraoral_photo',  true, 20, '{jpg,jpeg,png,heic,webp}', 1, 1),
    (org_id, coroa_id, 'FOTO_OCLUSAL',  'Foto Oclusal',  'Vista oclusal do elemento.',                'intraoral_photo',  true, 30, '{jpg,jpeg,png,heic,webp}', 1, 1),
    (org_id, coroa_id, 'RX',            'RX',            'Radiografia periapical.',                    'xray',             true, 40, '{jpg,jpeg,png,pdf}', 1, 1),
    (org_id, coroa_id, 'COR',           'Cor',           'Cor de escala.',                             'shade',            true, 50, '{}', 0, 0),
    (org_id, coroa_id, 'MATERIAL',      'Material',      'Material desejado.',                         'material_spec',    true, 60, '{}', 0, 0)
  on conflict do nothing;

  -- ─── GUIA CIRÚRGICO ──────────────────────────────────────────
  insert into public.case_checklist_templates
    (organization_id, case_type_id, code, title, description, category, required, sort_order, accepted_file_types, minimum_files, maximum_files)
  values
    (org_id, guia_id, 'STL_SUPERIOR',  'STL Superior', 'Escaneamento intraoral superior.',            'stl',                true, 10, '{stl,obj}', 1, 3),
    (org_id, guia_id, 'STL_INFERIOR',  'STL Inferior', 'Escaneamento intraoral inferior.',            'stl',                true, 20, '{stl,obj}', 1, 3),
    (org_id, guia_id, 'TOMOGRAFIA',    'Tomografia',   'Tomografia em DICOM.',                        'dicom_tomography',   true, 30, '{dcm,dicom,zip}', 1, 1),
    (org_id, guia_id, 'REGISTRO',      'Registro',     'Registro oclusal.',                            'bite_registration',  true, 40, '{stl,obj,jpg,jpeg,png}', 1, 2),
    (org_id, guia_id, 'PLANEJAMENTO',  'Planejamento', 'Planejamento cirúrgico (PDF ou STL).',        'planning',           true, 50, '{pdf,stl}', 1, 5)
  on conflict do nothing;

  -- ─── FACETA ──────────────────────────────────────────────────
  insert into public.case_checklist_templates
    (organization_id, case_type_id, code, title, description, category, required, sort_order, accepted_file_types, minimum_files, maximum_files)
  values
    (org_id, faceta_id, 'FOTOS',         'Fotos',       'Fotos frontais, laterais e sorriso.',      'extraoral_photo', true, 10, '{jpg,jpeg,png,heic,webp}', 3, 10),
    (org_id, faceta_id, 'STL',           'STL',         'Escaneamento intraoral.',                   'stl',             true, 20, '{stl,obj}', 1, 3),
    (org_id, faceta_id, 'COR',           'Cor',         'Cor de escala e referências estéticas.',    'shade',           true, 30, '{}', 0, 0),
    (org_id, faceta_id, 'OBSERVACOES',   'Observações', 'Notas clínicas e estéticas.',                'notes',           true, 40, '{}', 0, 0)
  on conflict do nothing;

  -- ─── LAMINADO ────────────────────────────────────────────────
  insert into public.case_checklist_templates
    (organization_id, case_type_id, code, title, description, category, required, sort_order, accepted_file_types, minimum_files, maximum_files)
  values
    (org_id, laminado_id, 'STL',       'STL',       'Escaneamento intraoral.',            'stl',             true, 10, '{stl,obj}', 1, 3),
    (org_id, laminado_id, 'FOTOS',     'Fotos',     'Fotos clínicas.',                     'extraoral_photo', true, 20, '{jpg,jpeg,png,heic,webp}', 2, 10),
    (org_id, laminado_id, 'COR',       'Cor',       'Cor.',                                'shade',           true, 30, '{}', 0, 0),
    (org_id, laminado_id, 'MATERIAL',  'Material',  'Material desejado.',                  'material_spec',   true, 40, '{}', 0, 0)
  on conflict do nothing;

  -- ─── MODELO IMPRESSO ─────────────────────────────────────────
  insert into public.case_checklist_templates
    (organization_id, case_type_id, code, title, description, category, required, sort_order, accepted_file_types, minimum_files, maximum_files)
  values
    (org_id, modelo_id, 'STL', 'STL', 'Escaneamento para modelo impresso.', 'stl', true, 10, '{stl,obj}', 1, 3)
  on conflict do nothing;
end $$;
