# Refatoração de Perfis · SUPER_ADMIN vs ADMIN (2026-08)

Este documento descreve a refatoração que separou definitivamente a
**administração da plataforma SaaS** (Bruno) da **operação diária do
escritório** (Aline).

## Por que

O menu do escritório continha itens exclusivos da plataforma — Domínio
próprio, Observabilidade, Integrações globais — o que:

- confundia o operacional com o técnico
- expunha superfícies de risco (DNS, SSL, feature flags globais)
- criava caminhos de escalada indevida de privilégio

A arquitetura já tinha os fundamentos (`platform_role` distinto de
`role`, layout `(super-admin)` separado, RLS por tenant). Faltava
consolidar a separação nas telas, guards e RLS.

## O que mudou

### Banco (migrations 0051 e 0052)

- Enum `user_role` estendido com `manager`, `reception`, `delivery`,
  `viewer` (papéis operacionais adicionais).
- Nova função `is_office_admin()` para clareza semântica.
- RLS de `profiles`: **três policies** de UPDATE claramente separadas:
  - `profile_update_self` — não muda role, organization_id, platform_role, status
  - `profile_update_admin` — office admin muta role/status no próprio tenant, nunca platform_role
  - `profile_update_platform` — único caminho para promover a super/support
- Trigger `profiles_prevent_platform_escalation` como defesa em
  profundidade contra qualquer bypass da RLS via UI.
- RLS de `tenant_domains`: **write exclusivo do platform admin**. Office
  admin mantém apenas leitura para visualizar a URL do próprio tenant.
- Nova org "SR Digital · Plataforma" (id zero) hospeda contas de
  platform admins como Bruno (respeitando FK NOT NULL de
  profiles.organization_id).
- Renomeada org seed para "SR Odontologia" (nome comercial correto).

### Backend

- `src/lib/permissions/roles.ts` — inclui MANAGER, RECEPTION, DELIVERY,
  VIEWER. Novo helper `isOfficeAdmin()`.
- `src/lib/permissions/can.ts` — matriz reescrita para as novas roles;
  `alwaysAllowed = { SUPER_ADMIN, ADMIN }`.
- `src/lib/permissions/platform.ts` — `PlatformRole` reexportado do
  tipo canônico em `types/database.ts`; novo helper
  `isSuperPlatformAdmin()`.
- `src/features/domains/actions.ts` — `requireOrgAdmin` substituído por
  `requirePlatformUser`. Actions passam a receber `organizationId`
  explícito.

### Frontend

- `src/components/hub/nav-groups.ts` — menu do ADMIN reescrito.
  Removidos: Domínio próprio, Observabilidade, Integrações, Automações.
  Reagrupado em Operação / Fluxo / Estúdio / Atendimento / Escritório.
- `src/app/(super-admin)/SuperAdminNav.tsx` — adicionado item Domínios.
- `src/app/(hub)/dominios/page.tsx` — passa a redirecionar para
  `/dashboard`. Componente `DomainsPanel` removido.
- `src/app/(hub)/observabilidade/page.tsx` — redirect residual.
- `src/app/(hub)/integracoes/page.tsx` — redirect residual.
- `src/app/(super-admin)/super-admin/dominios/page.tsx` — nova página
  com seleção de tenant + gerenciamento pelo SUPER_ADMIN.
- `src/app/(hub)/api-tokens/**` — movido de `/integracoes/api`. Fica
  no ADMIN pois tokens são do próprio tenant, não integração global.
- `src/app/(hub)/integracoes` — pasta deletada.

### Middleware

- `PLATFORM_PREFIXES` agora inclui `/dominios`, `/observabilidade`,
  `/integracoes`. Tratamento de anônimo estendido para incluir esses
  prefixos.
- `SENSITIVE_PREFIXES` expandido para revocation check nas mesmas rotas.

### Seeds

- `scripts/seed-roles.mjs` — bootstraps idempotentes:
  - Bruno → `platform_role='super'` (org "Platform")
  - Aline → `role='admin'` (org SR Odontologia)
- Script npm: `npm run hub:seed-roles`.

### Testes

- `tests/roles.test.ts` — cobre matriz `can()` com todas as novas roles.
- `e2e/rbac.spec.ts` — verifica que rotas de plataforma redirecionam
  anônimo e que menu do escritório não expõe itens técnicos.
- `e2e/guards.spec.ts` — lista expandida.

## Matriz de permissões final

Ver `docs/permissions.md`.

### Exclusivo do SUPER_ADMIN (`platform_role='super'`)

Rotas: `/super-admin/**`, `/dominios`, `/observabilidade`, `/integracoes`
Ações: criar/suspender/reativar tenants, planos, feature flags, jobs,
domínios (DNS/SSL/verificação), logs globais, auditoria global,
configurações de plataforma, impersonation.

### Exclusivo do ADMIN do escritório (`role='admin'` ou `super_admin`)

Rotas: `/dashboard`, `/leads`, `/dentistas`, `/clinicas`, `/casos`,
`/planejamento`, `/producao`, `/tecnicos`, `/qualidade`, `/financeiro`,
`/entregas/**`, `/agenda`, `/arquivos`, `/relatorios`, `/onboarding`,
`/branding`, `/equipe`, `/billing` (leitura de plano), `/lgpd`
(operacional de titulares), `/audit`, `/checklists`, `/api-tokens`.

Ações: gerir clientes, dentistas, pacientes, casos, orçamentos, agenda,
mensagens, equipe do próprio escritório, financeiro do próprio
escritório, relatórios operacionais, branding, dados comerciais.

## Como Bruno acessa a plataforma

1. Bruno faz login em qualquer hostname da plataforma (ex.
   `app.srdigital.com.br/login`).
2. Após autenticado, middleware confirma `platform_role in ('super','support')`.
3. Bruno navega para `/super-admin` — layout `(super-admin)` renderiza
   nav com Tenants, Domínios, Planos, Assinaturas, etc.
4. Para agir em um tenant específico, Bruno usa o fluxo de impersonation
   (`/super-admin/tenants/[id]` → botão Impersonar).

## Como Aline acessa o escritório

1. Aline abre `parceiro.srodontologia.com.br` (hostname do tenant SR
   Odontologia).
2. Middleware resolve o hostname → tenant → contexto.
3. Aline faz login. `platform_role=null` → não vê `/super-admin`.
4. É redirecionada para `/dashboard`. Menu operacional em 5 grupos.
5. Se tentar acessar `/dominios`, `/observabilidade` ou `/integracoes`
   por URL direta: middleware redireciona para `/dashboard`.

## Como o domínio é atribuído (fluxo canônico)

1. Bruno em `/super-admin/tenants` cria (ou seleciona) o tenant.
2. Bruno em `/super-admin/dominios` seleciona o tenant e adiciona o
   hostname (ex. `parceiro.srodontologia.com.br`).
3. Sistema gera token TXT (`_sr-verify.<hostname>`).
4. Bruno configura o DNS no provedor externo.
5. Bruno clica **Verificar** → job `domain_verify` enfileirado.
6. Status transiciona: `pending` → `verified` → `active` (SSL emitido).
7. Aline apenas usa o sistema no hostname atribuído — nunca vê DNS/SSL.

## Pendências reais

- Renomear role legada `super_admin` (que é admin do escritório, nome
  confuso) exigiria migration destrutiva. Mantida por retrocompatibilidade
  — o helper `isOfficeAdmin()` cobre ambos os valores para uso novo.
- Testes E2E autenticados de Bruno vs Aline exigem fixtures de seed
  automatizadas em CI. Marcados como "pendente autenticado" em
  `docs/e2e-testing.md`.
- Página `/lgpd` continua operacional (titulares/consentimentos). A
  configuração jurídica global (política de privacidade da plataforma,
  DPO) permanece com o SUPER_ADMIN e não tem UI dedicada ainda.
