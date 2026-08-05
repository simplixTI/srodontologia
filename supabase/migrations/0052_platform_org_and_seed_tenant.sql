-- =============================================================
-- 0052 · Platform org + renomeia SR Digital → SR Odontologia
--
-- • Cria/garante organização "Platform" (id zero) para hospedar
--   contas de SUPER_ADMIN (Bruno). profiles.organization_id é
--   NOT NULL, então SUPER_ADMIN vive em uma org dedicada que
--   nenhum outro usuário utiliza operacionalmente.
--
-- • Renomeia a organização seed (id 00000000-0000-0000-0000-000000000001)
--   para "SR Odontologia" (nome comercial correto do escritório).
--
-- • Adiciona a org "SR Digital · Plataforma" (id zero) usada apenas
--   por platform_users. Não é um tenant operacional.
--
-- Idempotente.
-- =============================================================

-- Platform org (host lógico para platform admins como Bruno).
insert into public.organizations (id, name, legal_name, email, address, settings)
values (
  '00000000-0000-0000-0000-000000000000',
  'SR Digital · Plataforma',
  'SR Digital SaaS',
  'suporte@srdigital.com.br',
  'Plataforma SaaS',
  jsonb_build_object('is_platform', true)
)
on conflict (id) do update
  set name       = excluded.name,
      legal_name = excluded.legal_name;

-- SR Odontologia (tenant real do escritório).
update public.organizations
set name       = 'SR Odontologia',
    legal_name = coalesce(legal_name, 'SR Odontologia Digital')
where id = '00000000-0000-0000-0000-000000000001';

-- Slug + trial status coerentes (colunas adicionadas em 0039).
update public.organizations
set slug                = coalesce(slug, 'srodontologia'),
    subscription_status = coalesce(subscription_status, 'active')
where id = '00000000-0000-0000-0000-000000000001';

comment on column public.organizations.settings is
  'JSON com preferências. is_platform=true marca org lógica que hospeda platform_users; não é tenant operacional.';
