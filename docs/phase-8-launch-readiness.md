# Fase 8 · Homologação, Custom Domains, E2E e Lançamento Controlado

Fase de fechamento das lacunas da Fase 7 + preparação para receber o primeiro cliente pagante.

## Escopo

| Área | Estado ao entrar | Estado ao sair |
|---|---|---|
| E2E | 14 unit tests | + Playwright + 5 specs (smoke, auth, guards, api, feedback) |
| CAPTCHA | ausente | Turnstile provider + Mock fallback + wire no signup + registro `captcha_failed` em security_events |
| Sentry | envelope manual | + `SentryLoader` (CDN loader, opt-in via `NEXT_PUBLIC_SENTRY_LOADER_SRC`) |
| Error boundaries | ausentes | + `ErrorFallback` + `error.tsx` em hub/portal/super-admin + global-error |
| App sessions | tabela vazia | + `recordSession` no login + `/perfil/seguranca/sessoes` com revogação |
| Cron DNS | manual apenas | + `revalidateDomainsTick` + `domain_verification_history` no `/api/cron` |
| Middleware hostname | resolver isolado | + propagação `x-sr-hostname` + validação anti-injection + carve-out de reserved subdomains |
| Cookies / auth callback | sem allowlist | + `safeRedirect` — só relative paths e hosts do allowlist |
| Analytics | ausente | + `product_analytics_events` + `track()` provider-agnostic com redação |
| Feedback | ausente | + `product_feedback` + `FeedbackButton` (fixed bottom-right em hub) |
| Status pública | apenas interna | + `/status` (revalida 30s) + `incidents` + `incident_updates` |
| Documentos legais | inexistentes | + tabelas `legal_documents` + `legal_acceptances` + páginas `/termos` `/privacidade` `/cookies` `/seguranca` |
| Release channels | inexistente | + tabela `tenant_release_channels` |
| SLA suporte | só priority | + `sla_hours`, `sla_due_at`, `first_response_at` em `support_tickets` |
| Seed demo | inexistente | + `scripts/seed-demo.mjs` protegido (SEED_DEMO_CONFIRM=yes + block em prod) |
| Smoke script | inexistente | + `scripts/smoke.mjs` (9 checks) + `npm run smoke` |

## Migration 0041

Tabelas novas:
- `app_sessions` — user_id, org_id, session_hash (sha256), ua, device_kind, browser, os, ip_hash, first/last_seen, revoked_at, revoke_reason, is_current, expires_at
- `domain_verification_history` — audit granular de mudanças de domínio
- `legal_documents` + `legal_acceptances`
- `product_feedback` + `product_analytics_events`
- `incidents` + `incident_updates`
- `tenant_release_channels`

Alterações:
- `tenant_domains` +next_check_at/+consecutive_failures/+provider/+provider_ref
- `support_tickets` +sla_hours/+sla_due_at/+first_response_at
- `job_kind` +domain_revalidate

Seeds:
- 3 legal_documents (termos, privacy, cookies) placeholder

## Rotas novas

- `/status` (pública) — status page com componentes + incidentes
- `/termos`, `/privacidade`, `/cookies`, `/seguranca` (públicas)
- `/perfil/seguranca/sessoes` (autenticada) — listar + revogar sessões
- E2E specs em `e2e/`

## Camadas novas em `src/lib`

- `captcha/` — types + turnstile + mock + verify + `evaluateAbuseFor` (progressivo)
- `sessions/registry.ts` — recordSession / revokeSession / revokeAllOtherSessions
- `analytics/tracker.ts` — track() com redação
- `domains/revalidation.ts` — cron periódico
- `auth/redirect-guard.ts` — `safeRedirect` (open-redirect defense)

## Explicitamente NÃO implementado nesta fase (declarado)

- **Sentry SDK completo (@sentry/nextjs)** — usei o CDN Loader (loader.js) para ficar leve. Setar `NEXT_PUBLIC_SENTRY_LOADER_SRC` é suficiente para começar. Migrar para @sentry/nextjs quando source-maps pipeline for necessário.
- **E2E completo de billing com Stripe CLI** — requer setup local do Stripe CLI + fixtures; script `docs/e2e-testing.md` documenta o roteiro.
- **Testes de carga** — script `docs/load-testing.md` documenta k6 scenarios; sem execução real (requer ambiente staging).
- **Vercel Domains API integration** — provider stubado na estrutura; requer credencial + escolha explícita de hosting.
- **CSRF middleware customizado** — Supabase cookies são httpOnly + SameSite=Lax por default; Next 14 Server Actions têm proteção nativa de origin. Adicionar CSRF middleware separado é overkill para essa stack.
- **Consentimento cookies popup** — política publicada em `/cookies`, mas sem popup opt-in (produto é B2B admin, não público em massa; adicionar quando necessário para GDPR EU).

## Números finais

- **41 migrations** aplicadas (0001-0041)
- **~70 tabelas** com RLS strict
- **7 storage buckets** (avatars, case-files, planning-files, delivery-files, documents, pdf-documents, lgpd-exports)
- **~250 arquivos** em `src/`
- **14 unit tests** + **5 E2E specs** (Playwright)
- **CI**: typecheck + unit + build + audit + secret-scan em cada PR
- **Smoke script** com 9 checks para gate de deploy
