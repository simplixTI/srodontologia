-- =============================================================
-- 0051 · RBAC hardening · separação plataforma vs escritório
--
-- Consolida a distinção entre:
--   • plataforma (SUPER_ADMIN)  → profiles.platform_role in ('super','support')
--   • escritório (ADMIN + ops)  → profiles.role
--
-- Escopos:
--   1. Estende enum user_role com papéis operacionais adicionais
--      (manager, reception, delivery, viewer).
--   2. Endurece RLS de profiles: nenhum ADMIN pode se auto-promover
--      a platform_role. Só service_role/is_platform_admin() muta essa
--      coluna. ADMIN também não pode alterar organization_id nem
--      escalar via role a partir da UI.
--   3. Bloqueia escrita em tenant_domains para não-plataforma
--      (leitura permanece para admins do tenant como informação).
--   4. Adiciona função is_office_admin() para clareza semântica.
--
-- Idempotente e retrocompatível: todos os dados existentes continuam
-- válidos. Roles legadas (super_admin/admin/commercial/etc) mantidas.
-- =============================================================

-- ─── 1) Enum user_role: adiciona papéis operacionais ─────────
-- Postgres não permite ADD VALUE dentro de transação com IF NOT EXISTS
-- em versões antigas; usamos DO $$ com checagem no catálogo pg_enum.
do $$
declare
  v text;
begin
  foreach v in array array['manager', 'reception', 'delivery', 'viewer']
  loop
    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'user_role' and e.enumlabel = v
    ) then
      execute format('alter type public.user_role add value %L', v);
    end if;
  end loop;
end $$;

-- ─── 2) Helper: is_office_admin() ────────────────────────────
-- role in ('super_admin','admin') dentro do mesmo tenant.
create or replace function public.is_office_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('super_admin', 'admin')
      and status = 'active'
  );
$$;

grant execute on function public.is_office_admin() to authenticated;

-- ─── 3) Endurece RLS de profiles ─────────────────────────────
-- Substitui as duas policies de UPDATE por versões que bloqueiam
-- escalada de platform_role e mudança de organization_id via UI.

drop policy if exists "profile_update_self"        on public.profiles;
drop policy if exists "profile_update_admin"       on public.profiles;
drop policy if exists "profile_update_platform"    on public.profiles;

-- (a) Self: nunca muda role, organization_id, platform_role ou status.
create policy "profile_update_self"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and organization_id = public.current_user_organization_id()
  and role            = public.current_user_role()
  and platform_role   is not distinct from (
        select p.platform_role from public.profiles p where p.id = auth.uid()
      )
  and status          = (
        select p.status from public.profiles p where p.id = auth.uid()
      )
);

-- (b) Office admin (ADMIN/SUPER_ADMIN do tenant): pode mutar role/status
--     dentro do próprio tenant, mas NUNCA platform_role nem organization_id.
create policy "profile_update_admin"
on public.profiles for update
to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.is_office_admin()
)
with check (
  organization_id = public.current_user_organization_id()
  and public.is_office_admin()
  and platform_role is not distinct from (
        select p.platform_role from public.profiles p where p.id = profiles.id
      )
);

-- (c) Platform admin: pode mutar platform_role de qualquer profile.
--     É o único caminho autorizado para promover alguém a super/support.
create policy "profile_update_platform"
on public.profiles for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- ─── 4) Trigger defesa em profundidade contra escalada ───────
-- Mesmo com RLS, adiciona verificação server-side em qualquer UPDATE.
-- Rejeita qualquer alteração de platform_role feita por caller que
-- não seja platform admin ou service_role.

create or replace function public.profiles_prevent_platform_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role bypass (auth.uid() é null para service_role em contextos server)
  if auth.uid() is null then
    return new;
  end if;

  if new.platform_role is distinct from old.platform_role then
    if not public.is_platform_admin() then
      raise exception 'platform_role_escalation_denied'
        using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_profiles_prevent_platform_escalation on public.profiles;
create trigger trg_profiles_prevent_platform_escalation
before update on public.profiles
for each row execute function public.profiles_prevent_platform_escalation();

-- ─── 5) Bloqueia escrita em tenant_domains para não-plataforma ──
-- Domínio próprio passa a ser função exclusiva do SUPER_ADMIN da
-- plataforma. Office admin mantém apenas leitura para visualizar
-- a URL atribuída ao seu tenant.

drop policy if exists "td_select"           on public.tenant_domains;
drop policy if exists "td_write_admin"      on public.tenant_domains;
drop policy if exists "td_write_platform"   on public.tenant_domains;
drop policy if exists "td_select_office"    on public.tenant_domains;

-- Read: office admin do próprio tenant OU platform admin.
create policy "td_select_office"
on public.tenant_domains for select to authenticated
using (
  (organization_id = public.current_user_organization_id()
   and public.is_office_admin())
  or public.is_platform_admin()
);

-- Write: exclusivo do platform admin.
create policy "td_write_platform"
on public.tenant_domains for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- ─── 6) Comentários de documentação ──────────────────────────
comment on function public.is_platform_admin() is
  'True se caller possui platform_role in (''super'',''support'') e status active. Usado para gate de rotas /super-admin.';

comment on function public.is_office_admin() is
  'True se caller possui role in (''super_admin'',''admin''). Usado para gate de administração do próprio tenant.';

comment on column public.profiles.platform_role is
  'Papel de plataforma (super/support). NULL para usuários operacionais. Mutável apenas por platform admin (RLS + trigger).';

comment on column public.profiles.role is
  'Papel operacional dentro do tenant. Escopo escritório. NUNCA promove a platform_role automaticamente.';
