# SR HUB · Perfis e permissões

## Papéis (`user_role` enum)

| Role | Descrição |
|------|-----------|
| `super_admin` | Acesso completo. Único que cria organizações e outros super_admins. |
| `admin` | Acesso operacional completo. Gestão de usuários da org (não de super_admins). |
| `commercial` | CRM, leads, dentistas, clínicas, orçamentos, tarefas. Sem custos internos. |
| `technical_planning` | Casos recebidos, arquivos, planejamentos, versões, aprovação. |
| `production` | Fila produtiva, etapas, QA, apontamento de tempo. |
| `finance` | Orçamentos aprovados, cobranças, pagamentos, estornos, relatórios financeiros. |
| `logistics` | Entregas, rastreio, confirmação de despacho/entrega. |
| `dentist` | Só dados próprios e casos das clínicas autorizadas. |

## RBAC no cliente
`src/lib/permissions/can.ts` implementa uma matriz `role × ability`. Uso:

```ts
import { can } from '@/lib/permissions/can';

if (can(profile.role, 'crm.write')) { ... }
```

**Isso é apenas UI shaping.** Toda escrita passa por:
1. Server Action (validação Zod)
2. Cliente Supabase server (RLS aplicada)

## RLS no banco

Helper functions (SECURITY DEFINER, `search_path = public`):
- `current_user_organization_id()`
- `current_user_role()`
- `is_super_admin()`
- `is_internal_user()`

Padrão de policy para uma tabela nova de negócio:
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
)
with check (
  organization_id = current_user_organization_id()
  and current_user_role() in ('admin', '<role específico>')
);
```

## Fluxo de senha
- **Bootstrap** — script cria auth user com senha temporária forte + `must_change_password = true`.
- **Primeiro login** — middleware força redirect para `/change-password`.
- **`/change-password`** — re-autentica com senha atual (server-side) antes de aceitar a nova.
- **Reset por link** — Supabase Auth envia link → `/reset-password` → `updateUser({ password })` → limpa `must_change_password`.

## Regras de senha
Definidas em `src/lib/validations/auth.ts` (Zod):
- Mínimo 10 caracteres
- Ao menos uma maiúscula, minúscula, número e símbolo
- Diferente da senha atual (na troca)

## O que NÃO logar
- Senhas, tokens, service role key
- Conteúdo integral de arquivos clínicos
- Dados pessoais além do necessário para debug
- Referências a pacientes com nome completo
