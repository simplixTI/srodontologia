-- =============================================================
-- 0011 · Seed · SR Digital organization
-- Idempotent. Safe to re-run.
-- =============================================================

insert into public.organizations (id, name, legal_name, email, whatsapp, address, settings)
values (
  '00000000-0000-0000-0000-000000000001',
  'SR Digital',
  'SR Odontologia Digital',
  'contato@srodontologiadigital.com.br',
  '+5532991651437',
  'Minas Gerais · Brasil',
  jsonb_build_object(
    'currency',       'BRL',
    'locale',         'pt-BR',
    'timezone',       'America/Sao_Paulo',
    'theme',          'dark',
    'case_number_prefix',  'SR-',
    'quote_number_prefix', 'ORC-'
  )
)
on conflict (id) do update
set name       = excluded.name,
    legal_name = excluded.legal_name,
    email      = excluded.email,
    whatsapp   = excluded.whatsapp,
    address    = excluded.address,
    settings   = excluded.settings;

-- Baseline settings rows
insert into public.system_settings (organization_id, key, value)
values
  ('00000000-0000-0000-0000-000000000001', 'branding',
    jsonb_build_object('primary_color', '#C9A24B', 'accent_color', '#F0DEA9')),
  ('00000000-0000-0000-0000-000000000001', 'numbering',
    jsonb_build_object('case_start', 1, 'quote_start', 1, 'invoice_start', 1))
on conflict (organization_id, key) do nothing;
