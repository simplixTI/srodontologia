# Fase 9 — Relatório de ativação de produção

## Contexto

Fase 9 é a virada de "produto codado + Fase 8 homologado internamente" para "pronto para provisionar o primeiro laboratório real". Não cria novos módulos odontológicos — fecha as pendências técnicas da Fase 8 e prepara operação.

## Trecho decidido pelo usuário

- **Provedor de pagamento em STANDBY** (2026-08-05). Trabalho Stripe-específico foi pausado. Código de billing permanece provider-agnostic (registry + adapter pattern). Reconciliation, webhook handler, testes de idempotência ficam como base reutilizável quando o provider for escolhido (Stripe, Mercado Pago, Asaas, Iugu, Pagar.me).

## Status por Tranche

### Tranche A · Observabilidade + testes reais ✅
- Sentry SDK oficial (`@sentry/nextjs`) instalado em client/server/edge
- Redação em `beforeSend` (deny keys, CPFs, emails, URLs)
- Playwright com webServer auto (npm scripts e2e/e2e:ci/e2e:ui/e2e:staging)
- Specs E2E: signup, portal-dentist, billing (Stripe test stub), LGPD, custom-domain (5 arquivos)
- FakeClock + testes unitários

### Tranche B · Billing + tempo (parcial · STRIPE STANDBY) ✅
- FakeClock wired em `dunning.ts`, `deletion-processor.ts`, `export-processor.ts`
- Testes: `deletion-gate.test.ts` (6), `billing-events-idempotency.test.ts` (6)
- `reconciliation.ts` + processor `billing-reconcile` protegido por `STRIPE_SECRET_KEY`
- **Skipped**: Stripe CLI no CI, billing E2E ponta-a-ponta (depende de provider escolhido)

### Tranche C · Domínios + sessões ✅
- `src/lib/domains/vercel-provider.ts`: addDomain, getDomain, verifyDomain, removeDomain, getConfiguration, checkSSLStatus
- `src/lib/sessions/device-recognition.ts`: fingerprint por browser+OS+IP/16, alert enfileirado ao ver device novo
- `csv-import.ts`, `device-alert.ts` registrados como job processors
- Middleware: check de revogação em rotas sensíveis (`/super-admin`, `/configuracoes`, `/api/v1/admin`, `/financeiro`) via RPC `is_session_revoked`
- Testes: `vercel-provider.test.ts` (8), `device-recognition.test.ts` (11)

### Tranche D · Importador CSV ✅
- Parser com sanitização (formula injection: =, +, -, @, tab, CR), encoding UTF-8/UTF-16 detection, limites (MAX_ROWS=50k, MAX_BYTES=5MB)
- 4 entidades: clinics, dentists, patients, cases (Zod schemas + templates)
- Orquestrador com dry-run + apply + idempotency key
- UI: `/configuracoes/importacoes` (lista) + `/configuracoes/importacoes/novo` (wizard)
- API pública: `/api/import/template?entity=X` (download CSV template)
- Job async `csv_import` para arquivos grandes
- Testes: `csv-parser.test.ts` (16), `import-entities.test.ts` (12)

### Tranche E · Homologação técnica ✅
- k6 scenarios: baseline (1 VU × 2m), small (10 × 5m), medium (50 × 5m), peak (100 × 3m)
- Guard anti-produção nos scripts (bloqueia `app.srdigital.com.br`)
- `scripts/validate-staging.mjs`: relatório de configuração externa sem expor segredos
- `/super-admin/config-status`: visão UI dos mesmos checks
- `docs/load-test-results.md`: template — nunca inventar valores
- npm scripts: `k6:baseline / :small / :medium / :peak`

### Tranche F · Ativação comercial ✅
- `src/lib/provisioning/tenant.ts`: `provisionTenant()` idempotente por slug
- `scripts/provision-tenant.mjs`: CLI protegida com confirmação `SIM`
- `src/lib/provisioning/tenant-health.ts`: score 0-100 com dimensões explícitas
- `docs/uat-plan.md`: roteiro por perfil (owner, admin, operator, finance, dentist)
- `docs/restore-drill-results.md`: procedimento + template (aguarda PITR)
- `docs/rollback-drill-results.md`: 6 cenários exercitáveis em staging

## Migrations aplicadas

Prod estava em Fase 5. Aplicadas via 4 steps SQL no Supabase Studio:
- **step 1**: `0044_fix_invoices_saas_columns.sql` (colunas SaaS em `invoices`)
- **step 2**: `0037 + 0038 + 0039` (enums iniciais + tabelas SaaS)
- **step 3**: enum extensions (8 valores: dead_letter, lgpd_export, etc.)
- **step 4**: `0040 + 0041 + 0042` (usa enums estendidos)

Migration `0043_fix_audit_trigger_column_ref.sql` já estava em prod ad-hoc — commit versionou.

## Métricas

- **82 testes unitários verdes** (Vitest)
- **Typecheck limpo**
- **Zero console.log/TODO/FIXME em `src/lib/import`, `src/lib/provisioning`**

## Pendências externas (aguardando cliente)

Nenhuma bloqueia o dia-a-dia. Todas são melhorias/homologação real:

| Item | Motivo | Ação necessária |
|------|--------|-----------------|
| **Provedor de pagamento** | Não decidido | Escolher provider e implementar adapter |
| **Supabase PITR** | Plano precisa ser Pro | Upgrade Supabase (custo) + drill |
| **Vercel API Token** | Custom domains inativos sem isso | Gerar token + adicionar env |
| **Sentry Auth Token** | Source maps não fazem upload | Gerar em sentry.io/settings/account/api/auth-tokens |
| **Turnstile keys** | CAPTCHA fallback ativo | Criar site em cloudflare/turnstile |
| **Upstash Redis** | Rate limit usa fallback in-memory | Criar db em upstash |
| **Email provider (Resend?)** | E-mails ficam em outbox sem envio | Escolher + `EMAIL_API_KEY` |
| **Staging Supabase** | Drills e load tests limitados a local | Criar projeto separado |
| **Documentos legais definitivos** | Placeholders no repo | Redação por jurídico → hash real |

## O que NÃO foi feito (deliberadamente)

- Testes E2E que exigem credenciais externas reais — ficam skipped no CI
- Restore/rollback/incident drills executados — aguardam ambiente
- Reconciliação com hit em provider de pagamento — aguarda provider
- Novos módulos odontológicos — fora de escopo Fase 9

## Como validar localmente

```bash
npm run test:run          # 82/82 passing
npx tsc --noEmit          # zero errors
npm run validate:staging  # relatório de config
npm run k6:baseline       # 1 VU × 2 min (precisa BASE_URL local)
```

## Como provisionar o primeiro tenant

```bash
node scripts/provision-tenant.mjs \
  --org "Lab Piloto" --slug lab-piloto \
  --owner-email dono@lab.com --owner-name "Dono Silva" \
  --plan business --channel pilot
```

CLI pede confirmação `SIM` antes de escrever. Cria org + subscription trial + owner com `must_change_password=true` + enfileira e-mail welcome.
