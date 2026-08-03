# SR HUB · Arquitetura

## Visão geral
SR HUB é o sistema operacional interno da SR Digital: CRM, gestão de casos clínicos, orçamentos, planejamento técnico, produção, financeiro, entregas, notificações e portal do dentista. Construído desde o dia 1 pensando em multitenancy (SaaS) e conformidade LGPD.

## Camadas
```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Next.js RSC + Client Components)                  │
│  ─ Site institucional (público)                             │
│  ─ Auth pages (/login, /forgot-password, /reset-password)    │
│  ─ SR HUB (/dashboard, /crm, ...)                            │
│  ─ Portal do Dentista (/portal/...)                          │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js server (route handlers + server actions)           │
│  ─ Middleware: refresh de sessão + guard de rotas           │
│  ─ Server actions: login, logout, forgot, reset, change     │
│  ─ Supabase server client (RLS ativo · sob a identidade    │
│    do usuário)                                              │
│  ─ Supabase admin client (SERVICE ROLE · scripts server-only)│
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase (PostgreSQL + Auth + Storage + Realtime)          │
│  ─ Tabelas: organizations, profiles, audit_logs, consents,   │
│    system_settings (Fase 1)                                 │
│  ─ RLS ativo em TODAS as tabelas de negócio                 │
│  ─ Helper functions SECURITY DEFINER (anti-recursão)        │
└─────────────────────────────────────────────────────────────┘
```

## Multitenancy
Toda tabela de negócio possui `organization_id uuid references organizations(id)`. Toda policy RLS filtra por `organization_id = current_user_organization_id()`. Isso permite futuramente onboarding de outras clínicas/laboratórios sem refatorar nada.

## Anti-recursão em RLS
A abordagem clássica de "policy consulta `profiles` para descobrir o role" quebra com recursão infinita. Solução:

1. Funções SQL `SECURITY DEFINER` no schema `public` (arquivo `0005_rls_helpers.sql`):
   - `current_user_organization_id()`
   - `current_user_role()`
   - `is_super_admin()`
   - `is_internal_user()`

2. Essas funções rodam **com o dono do schema** (bypassa RLS de `profiles`) mas leem `auth.uid()` do JWT do chamador → resultado correto sem loop.

3. As policies só chamam essas funções. Nunca fazem `SELECT ... FROM profiles WHERE id = auth.uid()` diretamente.

## Fluxo de autenticação
```
/login  ── loginAction ──▶ supabase.auth.signInWithPassword
                                  │
                                  ▼
                         profile.must_change_password?
                                  │
                       ┌──────────┴─────────┐
                       ▼                    ▼
              /change-password        /dashboard  (internos)
                       │                    │
                       ▼                   /portal (dentistas)
                    /dashboard OR /portal
```

O middleware (`src/middleware.ts`) refresca a sessão em **cada request** e:

- Redireciona anônimos que tocam áreas protegidas → `/login?next=...`
- Redireciona usuários logados em `/login` ou `/forgot-password` → home do role
- Bloqueia acesso cruzado (dentista tentando `/dashboard` etc.)
- Se `profile.status != 'active'` → força logout
- Se `must_change_password = true` → força `/change-password`

## Server Actions vs client fetch
- **Server Actions** para todas as mutações críticas (login, logout, reset, change) — não expõem endpoints REST, respeitam RLS, e usam cookies HttpOnly automaticamente.
- **TanStack Query** (a partir da Fase 2) para leituras client-side reativas.
- **Realtime** (Fase 4+) para live updates em casos/mensagens.

## Segurança em camadas
1. **Middleware** — sessão + role guard
2. **Layout server-side** — segunda checagem de role + status
3. **Server Action** — validação Zod + verifica auth + escrita
4. **RLS** — última linha de defesa no banco (mesmo se tudo acima falhar, um role errado não lê dados alheios)

Nunca depender de UI para segurança.

## Segredos
- `NEXT_PUBLIC_*` — enviados ao browser (só a anon key entra aqui)
- `SUPABASE_SERVICE_ROLE_KEY` — **apenas** em `src/lib/supabase/admin.ts` e `scripts/create-admin.mjs`, ambos com `import 'server-only'`.
- Nunca logar tokens, senhas, ou conteúdo de arquivos clínicos.
