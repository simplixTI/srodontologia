# Ambiente de staging

## Objetivo

Replicar produção para validar features + rodar E2E + testes de carga sem afetar clientes reais.

## Requisitos

Cada componente deve ser **separado** da produção:

| Componente | Produção | Staging |
|---|---|---|
| Supabase project | sr-digital-prod | sr-digital-staging |
| Stripe | Live mode | Test mode |
| Email | Domínio verificado | Domínio de teste ou sandbox |
| Storage | Buckets prod | Buckets staging |
| Cron | Vercel Cron prod | Vercel Cron staging (mesma config) |
| Domain | app.srdigital.com.br | staging.srdigital.com.br |
| Sentry env | production | staging |
| Upstash (rate-limit) | prod | staging (opcional) |

## Setup passo a passo

1. Criar novo projeto Supabase `sr-digital-staging`
2. Rodar migrations: `SUPABASE_DB_URL=<staging> npx supabase db push --include-all`
3. Criar Stripe products no test mode → salvar price ids
4. No Vercel: novo project **OR** target `staging` no mesmo project
5. Env vars:
   ```
   DEPLOY_ENV=staging
   NEXT_PUBLIC_SUPABASE_URL=<staging url>
   SUPABASE_SERVICE_ROLE_KEY=<staging key>
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_test_...
   NEXT_PUBLIC_APP_URL=https://staging.srdigital.com.br
   CRON_SECRET=<staging cron>
   ```
6. Cadastrar webhook do Stripe apontando para `https://staging.srdigital.com.br/api/webhooks/billing/stripe`
7. Rodar smoke: `E2E_BASE_URL=https://staging.srdigital.com.br npm run smoke`

## Feature Flags

Staging pode ter flags diferentes da produção. Use `feature_flag_overrides` para ativar features experimentais só em staging (target_type='tenant', target_id=<staging org id>).

## Seed inicial

Após primeiro deploy de staging:
```bash
DEPLOY_ENV=staging SEED_DEMO_CONFIRM=yes node --env-file=.env.staging scripts/seed-demo.mjs
```

Cria:
- Laboratório `[DEMO] Laboratório Demonstração` (slug `demo-lab`)
- 2 clínicas
- 3 casos

Não cria usuários (criar manualmente ou via script separado).

## Refresh de dados

Restaurar snapshot de produção em staging **NUNCA**:
- Viola LGPD (dados de clientes reais em ambiente de teste)
- Contamina auditoria

Estratégia correta:
- Seed anônimo
- Rerun `scripts/seed-demo.mjs` quando precisar dados frescos

## Nunca fazer

- Usar `STRIPE_SECRET_KEY` (live) em staging
- Enviar emails a clientes reais a partir de staging
- Apontar DNS de produção para staging
