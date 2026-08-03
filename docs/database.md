# SR HUB · Modelo de dados (Fase 1)

## Migrations
Numeradas e versionadas em `supabase/migrations/`. Ordem de aplicação:

| Nº | Arquivo | Descrição |
|----|---------|-----------|
| 0001 | `extensions_and_enums.sql` | pgcrypto, citext; enums `user_role`, `user_status` |
| 0002 | `updated_at.sql` | Trigger genérico `set_updated_at()` |
| 0003 | `organizations.sql` | Tabela raiz de multitenancy |
| 0004 | `profiles.sql` | Espelho de `auth.users` + role + must_change_password |
| 0005 | `rls_helpers.sql` | Funções SECURITY DEFINER anti-recursão |
| 0006 | `organizations_rls.sql` | Policies em `organizations` |
| 0007 | `profiles_rls.sql` | Policies em `profiles` (self, org internal, admin, super) |
| 0008 | `audit_logs.sql` | Log append-only + RLS |
| 0009 | `consents.sql` | Registro LGPD + RLS |
| 0010 | `system_settings.sql` | Config por org, key/value |
| 0011 | `seed_sr_digital.sql` | Insere a organização SR Digital (id fixo) |

## Diagrama simplificado
```
                       ┌─────────────────┐
                       │ organizations   │
                       └────────┬────────┘
                                │ 1
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
        ┌─────▼─────┐   ┌──────▼───────┐   ┌────▼──────────┐
        │ profiles  │   │ audit_logs   │   │ system_settings│
        └─────┬─────┘   └──────────────┘   └────────────────┘
              │
              │ id === auth.users.id
              ▼
        ┌──────────┐
        │auth.users│ (gerido pelo Supabase Auth)
        └──────────┘
```

## Convenções
- **PKs**: `uuid` gerado por `gen_random_uuid()` (exceto `audit_logs` que é `bigserial` para ordenação natural).
- **Timestamps**: sempre `timestamptz` em UTC (`timezone('utc', now())`), com trigger `set_updated_at()` onde faz sentido.
- **E-mails**: `citext` (case-insensitive).
- **Deleção**: preferir soft-delete (`archived_at`, `status`) — hard delete só via super_admin.
- **RLS**: `enable` **e** `force` (ativa até para o dono da tabela — só service_role passa).

## Enums

### `user_role`
```
super_admin | admin | commercial | technical_planning
production  | finance | logistics | dentist
```

### `user_status`
```
active | invited | suspended | archived
```

## Regras de acesso por tabela

| Tabela | Leitura | Escrita |
|--------|---------|---------|
| `organizations` | próprio org | admin/super_admin do org (insert: só super_admin) |
| `profiles` | self · staff interno do org | self (campos safe) · admin do org · super_admin (delete) |
| `audit_logs` | admin/super_admin do org | qualquer authenticated (append-only) |
| `consents` | self · admin/super_admin do org | self |
| `system_settings` | staff interno do org | admin/super_admin do org |

## Extensões da Fase 2 (planejado)
- `clinics`, `dentists`, `leads`, `commercial_activities`
- Todas com `organization_id`, RLS espelhando o padrão acima.
