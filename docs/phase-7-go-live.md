# Fase 7 · Go-live, Billing Real, Jobs Assíncronos, Confiabilidade

Fase de operação: transformar a fundação SaaS da Fase 6 em produto pronto para clientes pagantes.

## O que muda vs Fase 6

| Área | Fase 6 | Fase 7 |
|---|---|---|
| Billing | Provider abstrato + Stripe checkout | + Customer Portal, upgrade/downgrade com proration, todos os eventos Stripe, idempotência via `billing_events`, ciclo de inadimplência gradual |
| Jobs | Retry backoff exponencial | + status `dead_letter`, alertas automáticos, painel `/super-admin/jobs` com reprocessar/cancelar |
| Cron | Endpoint `/api/cron` sem lock | + `try_acquire_cron_lock()` (unique index), `cron_runs` audita |
| LGPD | Só solicitações (tabelas) | + processors reais de exportação + anonimização de organização/usuário |
| Domínios | CRUD com token | + verificação DNS real via `resolveTxt`, `hostname resolver` no runtime |
| E-mail | Provider abstrato | + `email_outbox` (queue lógica), 21 templates transacionais brandados |
| Segurança | Impersonação | + 2FA TOTP (RFC 6238) UI + backup codes + envelope encryption |
| Env | Não validado | + `zod` schema em `src/lib/env.ts` + `.env.example` completo |
| Rate limit | In-memory | + adapter Upstash Redis com fallback in-memory |
| Headers | Nenhum | + CSP, HSTS, X-Frame-Options, Permissions-Policy em `next.config.mjs` |
| Observabilidade | Painel de contadores | + logger estruturado JSON + error tracking (Sentry envelope) + `getPlatformStatus()` real |
| Alertas | Nenhum | + `operational_alerts` + `notification_channels` (Slack/Discord/Teams/webhook) |
| Testes | Nenhum | + vitest scaffold + testes para totp, cpf, rate-limit, stripe signature |
| CI/CD | Nenhum | + `.github/workflows/ci.yml` (typecheck + test + build + audit + secret scan) |
| Docs | Progress apenas | + 11 docs específicos + go-live checklist + runbooks |

## Migration 0040

- `organizations` +stripe_customer_id/+dunning_stage/+dunning_last_event_at
- `plans` +stripe_price_id_monthly/+stripe_price_id_yearly/+recommended
- `subscriptions` +stripe_price_id
- `billing_events` (idempotência: unique provider+external_event_id)
- `job_status` +dead_letter enum value
- `job_kind` +lgpd_export/+lgpd_deletion/+domain_verify
- `jobs` +correlation_id/+dead_lettered_at/+dead_letter_reason
- `cron_runs` (lock + histórico, unique active per name)
- `email_outbox` + `email_events`
- `notification_channels` (por org ou plataforma)
- `operational_alerts`
- `tenant_domains` +dns_record_type/+dns_record_name/+last_check_at/+check_error
- `dunning_policies` (configuração por org)
- View `v_platform_kpis`
- RPCs: `try_acquire_cron_lock`, `release_cron_lock`

## Fluxos completos disponíveis

1. **Signup → Trial → Checkout Stripe → Ativação** — via `/signup` (Fase 6) + `/billing` + webhook `checkout.session.completed`
2. **Upgrade/Downgrade com proration** — via `changePlanAction` → `stripeUpdate` com `proration_behavior=create_prorations`
3. **Customer Portal** — via `openCustomerPortalAction` → `billing_portal.sessions`
4. **Inadimplência gradual** — cron `dunning-tick` (executa a cada tick do cron do Vercel) avança stages 1→5 automaticamente
5. **Job → Retry → Dead-letter** — worker com backoff 1min/5min/15min/1h/6h; após max_attempts vai para dead_letter + alert automático + reprocessável via UI
6. **Exportação LGPD** — solicitação → job `lgpd_export` → bundle JSON no bucket `lgpd-exports` → URL assinada expira em 7d
7. **Deleção LGPD** — solicitação → 30d graça → job `lgpd_deletion` → anonimiza org+users OU deleta caso
8. **Domínio custom** — tenant adiciona → cria TXT `_sr-verify.<host>` → clica verificar → job `domain_verify` (`dns.resolveTxt`) → marca `verified`
9. **Impersonação** — banner obrigatório + audit em `security_events` (Fase 6, mantido)
10. **2FA** — `/perfil/seguranca` → gera secret + backup codes + QR URI → confirma código

## Camadas novas

```
src/lib/
├── billing/
│   ├── stripe-client.ts       # thin fetch wrapper (customer, checkout, portal, update, cancel)
│   ├── service.ts             # ensureCustomer, resolvePriceId, startCheckoutForOrg, changePlan, cancelForOrg, recordBillingEvent
│   ├── webhook-handler.ts     # HMAC + timestamp + idempotency + full event dispatch
│   ├── dunning.ts             # runDunningTick, evaluateWriteAllowance
│   └── providers/{mock,stripe}.ts   # Fase 6 (mantido para compat)
├── cron/
│   └── lock.ts                # acquireCronLock, releaseCronLock, runWithLock
├── domains/
│   └── verifier.ts            # resolveTxt-based verifier
├── email/
│   ├── templates.ts           # 21 templates HTML+text
│   └── outbox.ts              # queueEmail, dispatchOutboxTick
├── env.ts                     # zod schema, featureConfigured
├── lgpd/
│   ├── export-processor.ts    # bundle collector + storage upload
│   └── deletion-processor.ts  # anonymize/delete strategy
├── notifications/channels.ts  # raiseAlert + Slack/Discord/Teams/webhook fanout
├── observability/
│   ├── logger.ts              # structured JSON logs with secret redaction
│   ├── error-tracking.ts      # captureError + Sentry envelope (opt-in)
│   └── status.ts              # getPlatformStatus (7 checks, real data)
├── rate-limit-dist.ts         # distRateLimit (Upstash + memory fallback)
├── security/totp.ts           # RFC 6238 TOTP + backup codes + envelope encrypt
└── tenant/hostname.ts         # resolveTenantFromHostname (cache 30s)
```

## Rotas novas / atualizadas

- `POST /api/webhooks/billing/stripe` — completamente reescrito (idempotência real)
- `GET /api/health` — liveness (não toca DB)
- `GET /api/health/ready` — readiness com checks reais (DB, stripe/cron env)
- `GET /api/cron` — agora usa locks + roda dunning + overdue
- `/super-admin/status` — usa `getPlatformStatus()` real
- `/super-admin/alertas` — nova página, lista `operational_alerts`
- `/super-admin/jobs` — dead-letter, reprocessar, cancelar
- `/perfil/seguranca` — TOTP setup/disable

## Explicitamente NÃO implementado nesta fase

Marcado com clareza para diferenciar do que já roda:

- **Sentry** — abstração pronta, envelope POST implementado, mas SDK full não instalado. Setar `SENTRY_DSN` é suficiente para começar a receber erros; para stack frames completas migrar para `@sentry/nextjs` em iteração futura.
- **Backups automáticos** — não existe rotina que dispare snapshots. Depende de config no painel Supabase (backups já rodam lá; a checklist em `docs/backup-and-restore.md` cobre a config).
- **Session listing por dispositivo** — Supabase não expõe API para listar sessões ativas de outros dispositivos do mesmo usuário. Documentado como pendente externa.
- **Rate-limit distribuído** — código pronto, mas requer `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`. Sem eles cai para in-memory.
- **Testes E2E (Playwright)** — não escritos. Só unit tests em `tests/`.
- **DNS check automático via cron** — worker roda quando enfileirado por action; cron periódico de re-check pendente.
- **Custom domain reverse-proxy real** — `resolveTenantFromHostname` está pronto; falta wire no middleware (dispara chamada extra em SSR — feito sob demanda quando reactivamos SSR-por-hostname).
- **Nota fiscal externa** — Stripe emite recibos, mas emissão de NF-e no Brasil depende de integração externa (bling, focus, etc). Não incluído.

## Segurança — headers configurados

`next.config.mjs` (produção apenas):
- `Content-Security-Policy` — script-src 'self' + inline (Next 14 requer) + stripe.com; frame-src stripe apenas; connect-src supabase/stripe/upstash/openai/anthropic/google
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## Testes

Executados via `npm test` (vitest):
- `tests/totp.test.ts` — geração, verificação, encrypt round-trip, backup codes
- `tests/cpf.test.ts` — validador Módulo 11
- `tests/rate-limit.test.ts` — in-memory bucket
- `tests/stripe-signature.test.ts` — HMAC verify + tolerance + tampering

Rodar em CI: `.github/workflows/ci.yml` (typecheck + test + build + audit + secret scan).
