# SR HUB · Perfis e permissões

## Duas dimensões de administração

O sistema tem **duas dimensões independentes** de autorização, e é
fundamental não misturá-las:

| Dimensão | Coluna | Valores | Escopo |
|---|---|---|---|
| **Plataforma (SaaS)** | `profiles.platform_role` | `super`, `support`, `null` | Administração da plataforma inteira: tenants, planos, domínios, feature flags, infra |
| **Escritório (tenant)** | `profiles.role` | ver tabela abaixo | Operação diária dentro de um único tenant |

Um usuário pode ter **ambas** (raro), **apenas platform_role** (Bruno), ou
**apenas role** (todos os operacionais, incluindo Aline).

### Regra de escalada

- Nenhum usuário pode alterar seu próprio `platform_role`.
- Nenhum office admin (`admin` / `super_admin`) pode alterar `platform_role`
  de ninguém. Isso é bloqueado por:
  1. RLS policies em `profiles` (migration 0051)
  2. Trigger `profiles_prevent_platform_escalation` (defesa em profundidade)

## Papéis do escritório (`user_role` enum)

| Role | Descrição |
|------|-----------|
| `super_admin` | Nome legado — trata-se do admin proprietário do escritório. Equivalente a `admin` em privilégio. |
| `admin` | Administrador do escritório. Gerencia equipe, dados operacionais, configurações de atendimento. |
| `manager` | Gerente operacional. Acesso amplo mas sem controle de billing/team. |
| `commercial` | CRM, leads, dentistas, clínicas, orçamentos. |
| `reception` | Recepção — agenda, mensagens, cadastro de casos. |
| `technical_planning` | Casos recebidos, arquivos, planejamentos, versões, aprovação. |
| `production` | Fila produtiva, etapas, QA, apontamento. |
| `finance` | Orçamentos aprovados, cobranças, pagamentos, DRE. |
| `logistics` | Entregas, rastreio, romaneios. |
| `delivery` | Motoristas/entregadores — subset de logistics. |
| `viewer` | Read-only. |
| `dentist` | Externo. Apenas casos e clínicas autorizadas. |

## Papéis da plataforma (`profiles.platform_role`)

| Role | Descrição |
|------|-----------|
| `super` | SUPER_ADMIN. Único que cria tenants, gerencia domínios, planos, infraestrutura. |
| `support` | Suporte técnico. Pode impersonar em modo auditado. |
| `null`   | Usuário operacional; não vê nada da plataforma. |

## RBAC no cliente

`src/lib/permissions/can.ts` implementa uma matriz `role × ability`
apenas para modelagem de UI. Uso:

```ts
import { can } from '@/lib/permissions/can';

if (can(profile.role, 'crm.write')) { ... }
```

`super_admin` e `admin` recebem `alwaysAllowed = true` para todas as
abilities. As demais roles são explicitamente listadas por ability.

**Isso é apenas UI shaping.** Toda escrita passa por:
1. Server Action (validação Zod)
2. Cliente Supabase server (RLS aplicada)

Para plataforma, use `getPlatformUser()` / `requirePlatformUser()` em
`src/lib/permissions/platform.ts`.

## RLS no banco

Helper functions (SECURITY DEFINER, `search_path = public`):

- `current_user_organization_id()` — tenant do caller
- `current_user_role()` — role operacional
- `is_super_admin()` — role in ('super_admin')
- `is_office_admin()` — role in ('super_admin', 'admin')
- `is_internal_user()` — não é dentist
- `is_platform_admin()` — platform_role in ('super', 'support')

### Padrão de policy para tabela de negócio (por tenant)

```sql
create policy "select_own_org_internal"
on <tabela> for select to authenticated
using (
  organization_id = current_user_organization_id()
  and is_internal_user()
);

create policy "write_own_org_role"
on <tabela> for all to authenticated
using (
  organization_id = current_user_organization_id()
  and current_user_role() in ('admin', '<role específico>')
);
```

### Padrão de policy para tabela de plataforma

```sql
create policy "platform_only"
on <tabela> for all to authenticated
using (is_platform_admin())
with check (is_platform_admin());
```

Aplicado em: `plans`, `feature_flags`, `tenant_provisioning_runs`, e
(desde 0051) `tenant_domains` (write).

## Rotas exclusivas da plataforma

O middleware bloqueia acesso não-`platform_role`:

- `/super-admin/**`
- `/dominios` (redirect residual)
- `/observabilidade` (redirect residual)
- `/integracoes` (redirect residual)

## Sementes canônicas

Ver `scripts/seed-roles.mjs`:

- **Bruno** — `platform_role='super'`, `role='admin'`, `organization_id`
  da org "Platform" (id zero). Acessa `/super-admin`.
- **Aline** — `role='admin'`, `platform_role=null`, `organization_id`
  do tenant SR Odontologia. Acessa `/dashboard`.

Rodar:

```bash
npm run hub:seed-roles
```
