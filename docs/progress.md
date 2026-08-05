# SR Digital · Progresso do produto

Timeline canônica do desenvolvimento. Cada linha = um marco entregue em produção.

## 🏛️ Site institucional
- Site público em `srodontologiadigital.com.br` (Next.js 14, black + gold luxo)
- 8 seções: Hero, Why Us, Manifesto, How It Works (7 etapas), Technology (6 cards), Differential, Cases, Testimonials, Stats, CTA
- Rebranding: **SR Digital Center** (removido "Implant" para não restringir escopo)
- Textos institucionais atualizados (Planning Center + Laboratório CAD/CAM)
- WhatsApp float + Back to top + custom cursor

## 🔐 Fase 1 · Fundação
- Supabase + `@supabase/ssr` (browser/server/admin/middleware clients)
- 11 migrations: organizations, profiles, audit_logs, consents, system_settings + RLS helpers SECURITY DEFINER
- RBAC 8 roles + label PT-BR
- Middleware refresh + guard + must_change_password
- Auth pages: login, forgot, reset, change-password (mandatory first login)
- Sidebar HUB (13 items) + Header com perfil
- Script `create-admin.mjs` (Aline como super_admin)
- Email Resend + template de welcome
- Site em produção Vercel + Supabase integração

## 📋 Fase 2 · Case Checklist Engine
- Migrations 0012-0014: `case_types` + `case_checklist_templates` + seed com 6 tipos e 33 itens
- `/checklists` list + `/checklists/[id]` editor (drag-drop reorder, toggle obrigatório, edição inline, dentist preview live)
- `/checklists/new` criar tipo

## 🏭 Fase 2B · Operational Core (5 tranches)
- **T1** — 19 migrations + storage buckets + demo seed (2 clínicas + 3 dentistas)
- **T1** — CRUD clínicas + dentistas + leads básico
- **T2** — Kanban drag-drop leads · Conversão lead→dentista · Dashboard real
- **T3** — Casos: wizard, checklist instanciado, Case Health Score real
- **T4** — Upload real via Supabase Storage + auto-classificação + preview + signed URLs
- **T5** — Messages · Notifications bell · Deliveries · Quotes · Planning

## 🚀 Fase 3 · Módulo Operacional (5 tranches)
- **T-A** — UX foundations: Sonner, Radix Dialog, ConfirmProvider, Skeleton, Breadcrumbs, 404 elegante
- **T-B** — SLA engine + orçamentos ricos com itens + entregas com motorista/comprovante + mensagens reply
- **T-C** — Dashboard executivo com Recharts + Command Palette ⌘K + filtros avançados em `/casos`
- **T-D** — Auditoria automática (migration 0035) + notificações automáticas (migration 0036) + página `/audit`
- **T-E** — Rate limit + compressão de imagem client-side + skeletons finais + docs consolidadas

## ✅ Fase 4 · Portal do Dentista
- Layout mobile-first (`lg:hidden` bottom-nav + `lg:flex` sidebar) + guard dupla (role=dentist + active)
- Dashboard portal com 4 KPIs reais + quick actions + atividades + WhatsApp CTA
- Casos: lista com filtros, detalhe com 6 tabs (Overview/Files/Quotes/Planning/Chat/Delivery)
- Wizard novo caso (3 steps) + upload real + checklist instanciado
- Aprovar orçamento/planejamento com IP + user_agent (via SECURITY DEFINER RPC + `quote_actions`/`planning_actions`)
- Confirmar recebimento de entrega com auditoria
- `quotes_public` view sanitizada (exclui `internal_notes`)
- Migration 0037: `case_message_reads`, 5 RPCs `dentist_*`

## ✅ Fase 5 · IA, Automação e Diferenciais
- Migration 0038: jobs + domain_events + ai_settings + integration_settings + automation_rules + webhooks + search_index + case_ai_summaries + ai_usage_log + cpf_lookup_cache + ocr_extractions + pdf_documents + api_keys
- **Fundação** (Tranche A): AI Provider (Mock+OpenAI+Anthropic+Google+OpenRouter) · Event Bus persistente · Job Queue com SKIP LOCKED + backoff · Automation Runner · Search Writer · Webhook Dispatcher · Cron endpoint + worker script
- **Automação de dados** (Tranche B): CPF provider (validação+cache sha256+rate-limit) · OCR pipeline com revisão humana em `/hub/ocr` · Smart Search em `/hub/busca` (tsvector pt-BR)
- **Assistentes** (Tranche C): `/hub/assistente` (lab, com insights reais) · `/portal/assistente` (dentista) · resumo automático por caso (cached) · dashboard IA insights
- **Central de Automações** (Tranche D): `/hub/automacoes` (CRUD regras) · `/hub/integracoes` (providers + IA settings)
- **Plataforma** (Tranche E): API pública `/api/v1/*` com OpenAPI · `/hub/integracoes/api` (chaves hasheadas) · `/hub/observabilidade` (filas+eventos+IA usage)

## ✅ Fase 6 · SaaS, Multi-Tenant Avançado, Faturamento e Produção
- Migration 0039: `plans` (Starter/Pro/Business/Enterprise) · `subscriptions` + `subscription_events` · `invoices` + `invoice_items` + `payment_methods` · `feature_flags` + `overrides` · `tenant_usage_counters` · `tenant_domains` · `team_invitations` · `impersonation_sessions` · `support_tickets` · `data_export_requests` + `data_deletion_requests` · `user_totp_secrets` · `security_events`
- **Tranche A · Fundação SaaS:** `profiles.platform_role` (super/support) · `is_platform_admin()` RPC · Portal `/super-admin/*` (12 rotas: overview, tenants, planos, assinaturas, faturamento, features, suporte, logs, status, jobs, usuários, config) · Guards em middleware
- **Tranche B · Billing + Trial:** Provider abstrato (`src/lib/billing/`) + adapters Mock/Stripe (HMAC validado) · Webhook receiver `/api/webhooks/billing/{provider}` · `/signup` self-serve com 14d trial · `/onboarding` wizard 6 etapas
- **Tranche C · Feature Flags + Limits + White-Label:** Cascata user > role > tenant > plan > default via `check_feature_flag()` · `assertWithinLimit()` + `incrementUsage()` (wired em `createCaseAction`) · `/branding` + `/dominios` (white-label + custom domain com token DNS)
- **Tranche D · Equipe + Impersonação + LGPD:** `/equipe` (convites com token 7d) · Impersonação com cookie httpOnly + banner amarelo obrigatório + `security_events` · `/lgpd` (export + exclusão 30d) · `/suporte`
- **Tranche E · Billing tenant + Docs:** `/billing` + `/billing/success` (upgrade self-serve) · Docs `phase-6-saas.md`

## ✅ Fase 7 · Go-live, Billing Real, Jobs, Confiabilidade
- Migration 0040: `billing_events` (idempotência) · `cron_runs` (lock + histórico) · `email_outbox` + `email_events` · `notification_channels` · `operational_alerts` · `dunning_policies` · `job_status` +dead_letter · `job_kind` +lgpd_export/+lgpd_deletion/+domain_verify · `organizations`/`plans`/`subscriptions` +stripe ids · `tenant_domains` +DNS check fields · view `v_platform_kpis` · RPCs `try_acquire_cron_lock`/`release_cron_lock`
- **Tranche A · Billing real:** [src/lib/billing/stripe-client.ts](src/lib/billing/stripe-client.ts) (customer/checkout/portal/update/cancel) · [service.ts](src/lib/billing/service.ts) (`ensureCustomer`, `resolvePriceId`, upgrade/downgrade com proration) · [webhook-handler.ts](src/lib/billing/webhook-handler.ts) (HMAC + timestamp + idempotência + full dispatch) · [dunning.ts](src/lib/billing/dunning.ts) (política 0/3/7/15/30 dias) · Customer Portal + tenant `/billing` upgrade
- **Tranche B · Jobs prod:** dead-letter enum + alertas automáticos · backoff 1min→5min→15min→1h→6h com jitter · cron locks via `try_acquire_cron_lock` · `/super-admin/jobs` com reprocess/cancel + tabs por status · dunning tick no cron
- **Tranche C · LGPD + Domains real:** processor de exportação (bundle JSON no bucket) · processor de deleção (anonimiza org/user OU deleta caso, preserva auditoria) · DNS verify real via `dns.resolveTxt` · [hostname.ts](src/lib/tenant/hostname.ts) (custom domain > subdomain > platform, cache 30s, 15 subdomínios reservados)
- **Tranche D · Comunicação + Segurança:** 21 [templates de email](src/lib/email/templates.ts) HTML+text brandados · [outbox](src/lib/email/outbox.ts) com lock otimista · TOTP RFC 6238 completo ([totp.ts](src/lib/security/totp.ts) + `/perfil/seguranca` UI) com envelope encryption · [env validation](src/lib/env.ts) zod + `.env.example` completo · [rate-limit-dist.ts](src/lib/rate-limit-dist.ts) (Upstash + fallback) · [security headers](next.config.mjs) (CSP/HSTS/X-Frame-Options/Permissions-Policy) em produção
- **Tranche E · Observabilidade:** [logger](src/lib/observability/logger.ts) JSON estruturado com redação de segredos · [error-tracking.ts](src/lib/observability/error-tracking.ts) (Sentry envelope) · [status.ts](src/lib/observability/status.ts) 7 checks reais · [alerts + channels](src/lib/notifications/channels.ts) Slack/Discord/Teams/webhook · `/super-admin/alertas` + `/super-admin/status` real · `/api/health` + `/api/health/ready`
- **Tranche F · Produção:** `.env.example` · [.github/workflows/ci.yml](.github/workflows/ci.yml) (typecheck+test+build+audit+secret-scan) · vitest scaffold ([14 testes passando](tests/): totp, cpf, rate-limit, stripe-signature) · 11 docs (phase-7-go-live, production-architecture, deployment, environment-variables, billing, jobs-and-workers, lgpd-operations, custom-domains, monitoring, security-hardening, backup-and-restore) · [go-live-checklist](docs/go-live-checklist.md) + 5 runbooks

## ✅ Fase 8 · Homologação Final, Hardening, E2E, Custom Domains
- Migration 0041: `app_sessions` · `domain_verification_history` · `legal_documents` + `legal_acceptances` · `product_feedback` · `product_analytics_events` · `incidents` + `incident_updates` · `tenant_release_channels` · `tenant_domains` +DNS revalidation fields · `support_tickets` +SLA
- **Tranche A · E2E:** [Playwright](playwright.config.ts) + 5 specs ([smoke](e2e/smoke.spec.ts), [auth](e2e/auth.spec.ts), [guards](e2e/guards.spec.ts) para todas as prefixes protegidas, [api](e2e/api.spec.ts) v1 auth) + fixtures + `npm run e2e` / `e2e:smoke`
- **Tranche B · Segurança:** CAPTCHA provider abstract ([Turnstile](src/lib/captcha/providers/turnstile.ts) + Mock) + wire em `/signup` + `evaluateAbuseFor` progressivo · [Sentry Loader](src/components/errors/SentryLoader.tsx) opt-in (bundle ~2KB) · [ErrorFallback](src/components/errors/ErrorFallback.tsx) + `error.tsx` em hub/portal/super-admin + `global-error.tsx`
- **Tranche C · Custom Domains:** [middleware](src/middleware.ts) propaga `x-sr-hostname` + valida anti-injection + carve-out subdomínios reservados · [safeRedirect](src/lib/auth/redirect-guard.ts) (open-redirect defense com allowlist) · [revalidateDomainsTick](src/lib/domains/revalidation.ts) no cron (15min/24h/backoff) · `domain_verification_history` audit
- **Tranche D · Sessões:** [recordSession](src/lib/sessions/registry.ts) wired no login · `/perfil/seguranca/sessoes` (listar + revogar individual + revogar todas) · session_hash sha256, ip_hash com salt, device parse do UA
- **Tranche E · Launch:** [analytics/tracker.ts](src/lib/analytics/tracker.ts) com redação (13 event types, campos sensíveis blocked) · [FeedbackButton](src/components/feedback/FeedbackButton.tsx) fixo em todo hub · `/status` pública (revalida 30s) com incidents · [seed-demo.mjs](scripts/seed-demo.mjs) protegido (SEED_DEMO_CONFIRM=yes + block em production)
- **Tranche F · Comercial:** páginas `/termos`, `/privacidade`, `/cookies`, `/seguranca` (públicas, hydrated de `legal_documents`) · [smoke.mjs](scripts/smoke.mjs) 9 checks · 14 docs novos (phase-8, e2e-testing, custom-domain-routing, captcha-and-abuse-protection, session-management, error-tracking, load-testing, security-testing, staging-environment, pilot-operation, first-tenant-onboarding, release-and-rollback, product-analytics, support-sla)

## 🏭 Fase 10A · Produção (MES) + Técnicos
- Migration [0045](supabase/migrations/0045_phase10a_production_mes.sql): `production_stages` (etapas configuráveis por org, seed default de 9 etapas) · `production_cards` (1:1 com `cases`, prioridade, SLA, `total_time_ms`, `rework_count`) · `production_events` (histórico imutável de transições com `duration_ms`) · `technicians` (extensão de `profiles`, `specialty`, `team`, `hourly_cost`, `weekly_hours`) · `technician_skills` (com nível `beginner..expert`) · `technician_availability` · views `v_production_metrics` e `v_technician_workload` · RPC `advance_production_card` (transição atômica com validação same-org e cálculo automático de SLA) · seed `seed_default_production_stages(org_id)` idempotente
- **Kanban Produção** [/producao](src/app/hub/producao/page.tsx): SSR + drag/drop otimista + filtros (prioridade, sem responsável, atrasados) · [ProductionKanban.tsx](src/app/hub/producao/ProductionKanban.tsx) client component com priority dropdown inline · [/producao/[cardId]](src/app/hub/producao/[cardId]/page.tsx) detalhe com KPIs (etapa/prioridade/retrabalho/tempo total), painel Avançar Etapa + Retrabalho, painel Prioridade, linha do tempo de transições
- **Config de etapas** [/producao/configurar](src/app/hub/producao/configurar/page.tsx): CRUD com reorder (setas), toggle ativa/inativa, delete bloqueado se houver cartões
- **Técnicos** [/tecnicos](src/app/hub/tecnicos/page.tsx): lista com KPIs (fila ativa, atrasados, urgentes, retrabalho total) via `v_technician_workload` · [/tecnicos/novo](src/app/hub/tecnicos/novo/page.tsx) form promove profile a técnico com validação de disponibilidade · [/tecnicos/[id]](src/app/hub/tecnicos/[id]/page.tsx) detalhe + fila + painel de skills
- **Server actions** [features/production/actions.ts](src/features/production/actions.ts): `createStageAction`, `updateStageAction`, `deleteStageAction`, `reorderStagesAction`, `createCardForCaseAction`, `advanceCardAction`, `assignCardAction`, `updatePriorityAction` · [features/technicians/actions.ts](src/features/technicians/actions.ts): `createTechnicianAction`, `updateTechnicianAction`, `updateStatusAction`, `addSkillAction`, `removeSkillAction`, `deleteTechnicianAction`
- **Event bus** 5 novos types: `production.card_created`, `production.stage_changed`, `production.rework_flagged`, `production.card_completed`, `production.card_assigned` — publicados em cada transição pelas actions
- **RLS strict + role gate**: config só `super_admin`/`admin`/`technical_planning`; cards e events aceitam `production` e `logistics`; técnicos apenas admin/planning
- **Nav**: grupo Fluxo agora com `/producao` e `/tecnicos` ativos ([nav-groups.ts](src/components/hub/nav-groups.ts))
- **Testes**: [production-validations.test.ts](tests/production-validations.test.ts) (25 testes de schemas Zod) · [production.spec.ts](e2e/production.spec.ts) smoke E2E de rotas protegidas · **107 testes vitest passando** · typecheck limpo
- **Docs**: [phase-10a-production-mes.md](docs/phase-10a-production-mes.md) · plano em [docs/superpowers/plans/2026-08-05-fase-10a-producao-mes.md](docs/superpowers/plans/2026-08-05-fase-10a-producao-mes.md)

## ⏭️ Próximo
- 2FA UI (base `user_totp_secrets` já criada) + enforcement via flag `security.2fa_required`
- Processor jobs `data_export` + `data_deletion` (agendada, execução em 30d)
- Adaptadores billing MP/Asaas/Iugu/Pagar.me
- Multimodal image analysis (GPT-4o / Claude Sonnet / Gemini Vision) — feature flag já criada
- pgvector para busca semântica além de tsvector
- Rate-limit distribuído (Upstash/Redis) para escala > 100 orgs
- SDKs oficiais (`@sr/api-client-js`, `@sr/api-client-py`)
- Custom domain reverse-proxy real
- Ajustar template Resend (já feito na Fase 5 pós-tarefa)

## Números atuais
- **45 migrations** aplicadas no Supabase (0001-0045)
- **~70 tabelas** com RLS strict (6 novas na Fase 10A)
- **6 storage buckets** privados
- **~230+ arquivos** em `src/`
- **4 áreas de rotas:** `/super-admin/*` (12), `/hub/*` (28+), `/portal/*` (6), `/api/*` (v1 pública + webhooks + cron)
- API pública: `/api/v1/cases`, `/api/v1/openapi`
- Webhook billing: `/api/webhooks/billing/{provider}` (Stripe HMAC)
- Signup público self-serve: `/signup` (14 dias trial no plano Starter)
- **107 testes vitest passando**; typecheck limpo
