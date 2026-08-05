# Testes E2E

Playwright cobre os fluxos críticos que travariam operação se quebrassem.

## Estrutura

```
e2e/
├── fixtures/testUser.ts   # gera identidade única por teste
├── smoke.spec.ts          # health/ready/home/login — bloqueia deploy
├── auth.spec.ts           # login form + forgot password
├── guards.spec.ts         # middleware redirect para /login em toda rota protegida
├── api.spec.ts            # API v1 rejeita bearer inválido, openapi disponível
└── README.md              # como rodar
```

## Rodar

```bash
# 1. Instalar browsers (uma vez)
npm run e2e:install

# 2. Contra dev local (subir servidor via config):
E2E_START_SERVER=1 npm run e2e

# 3. Contra dev já rodando:
npm run dev &
npm run e2e

# 4. Contra staging:
E2E_BASE_URL=https://staging.srdigital.com.br npm run e2e

# 5. Apenas smoke (pós-deploy):
npm run e2e:smoke
```

## Filosofia

- **Nunca** rodar contra produção.
- **Nunca** usar credenciais reais de cliente.
- Fixtures criam identidades únicas (`e2e+{hex}@srdigital.local`).
- Testes de smoke são não-destrutivos.

## Roteiro completo — pendente de implementação

O prompt da Fase 8 listou 30+ cenários. Implementei o essencial (smoke + guards + api + auth form). Os restantes precisam de fixtures mais elaboradas + seed no ambiente de teste:

**Autenticação (implementado parcialmente):**
- ✅ Login inválido
- ✅ Forgot password page renderiza
- ⏳ Signup válido → requer captcha bypass em CI (usar mock provider, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` unset)
- ⏳ Rate limit login (requer seed user + 9 tentativas)
- ⏳ Sessão expirada, logout, redirecionamento por role

**Onboarding + Trial:**
- ⏳ Signup → onboarding steps → primeiro caso (requer stripe mock ativo + trial 14d)

**Portal do dentista:**
- ⏳ Login dentist, visualização de casos, upload, aprovar orçamento, ausência de notas internas
- Depende de seed com case + quote no DB

**Operação:**
- ⏳ Criação de caso, alteração status, timeline, upload, orçamento (fluxos internos)

**Billing:**
- ⏳ Checkout via Stripe CLI (`stripe listen --forward-to localhost:3000/api/webhooks/billing/stripe`)
- Requer STRIPE_SECRET_KEY test + STRIPE_WEBHOOK_SECRET test em CI

**Jobs/LGPD/Super Admin:**
- ⏳ Requer usuário com `platform_role='super'` seeded

## Como expandir

1. Criar fixture que cria tenant + admin + dentist via `admin.auth.admin.createUser` (server-side, em `e2e/fixtures/`)
2. Loginar via `page.request.post('/api/auth/signin', ...)` OU simular via cookies
3. Testar o fluxo
4. `teardown` deleta o tenant

Ver [Playwright docs](https://playwright.dev/docs/api/class-fixtures) para pattern.

## CI

`.github/workflows/ci.yml` roda unit tests + typecheck + build. E2E NÃO está em CI ainda (para evitar consumir minutos + requer secrets configurados). Habilitar em job separado com `secrets: E2E_BASE_URL, E2E_SUPABASE_SERVICE_KEY`.
