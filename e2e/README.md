# E2E tests

Testes end-to-end com Playwright. Cobrem os fluxos críticos que travariam operação comercial se quebrassem.

## Rodar localmente

```bash
# 1. servidor de dev deve estar rodando OU deixar o Playwright subir:
E2E_START_SERVER=1 npx playwright test

# 2. ou contra dev já rodando:
npm run dev &
npx playwright test

# 3. contra staging:
E2E_BASE_URL=https://staging.srdigital.com.br npx playwright test
```

## Filosofia

- **Nunca** rodar contra produção.
- **Nunca** usar credenciais reais de cliente.
- Fixtures criam tenants isolados (email `e2e+{uuid}@srdigital.local`) e limpam ao final.
- Se um teste depende de webhook Stripe, usar Stripe CLI (`stripe listen`) — não fingimos webhooks.

## Estrutura

```
e2e/
├── fixtures/       # helpers reutilizáveis
├── auth.spec.ts    # signup + login + rate-limit
├── super-admin.spec.ts
├── portal.spec.ts
├── jobs.spec.ts
└── smoke.spec.ts   # pós-deploy
```

## Cenários cobertos

1. Signup + login → auth.spec.ts
2. Guards de área (dentist não entra em /dashboard, internal não entra em /portal)
3. Super Admin bloqueia usuário comum
4. Portal do dentista renderiza casos permitidos (RLS)
5. Painel de jobs exibe status
6. Smoke: home, health, readiness, login page renderiza

## Pendentes (Fase 8 documentou, não implementou como suite completa)

- E2E completo de billing com Stripe CLI
- E2E de LGPD (requer fake clock para 30d graça)
- E2E de custom domain (requer DNS mockado)
- E2E de impersonation (requer criação de platform user via seed)

Ver `docs/e2e-testing.md` para o roteiro completo.
