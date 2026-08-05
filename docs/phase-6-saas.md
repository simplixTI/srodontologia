# Fase 6 · SaaS, Multi-Tenant Avançado, Faturamento e Produção

Transforma o produto em SaaS enterprise pronto para comercialização em massa. Mantém compatibilidade total com as Fases 1-5.

## Princípios

1. **Plataforma vs Tenant** — `super_admin` (fase anterior) é role dentro do tenant. A nova coluna `profiles.platform_role` separa administração da plataforma. Rota `/super-admin/*` só acessível a `platform_role IN ('super','support')`.
2. **Todo provider externo (billing) atrás de interface** — Mock/Stripe/MP/Asaas/Iugu/Pagar.me. Sistema roda 100% sem chaves.
3. **Feature flags cascata** — `user > role > tenant > plan > default`. Uma RPC SECURITY DEFINER (`check_feature_flag`) resolve.
4. **Limites enforçados no server action** — `assertWithinLimit(org, metric)` + `incrementUsage()` após criação bem-sucedida. Nada bypassa: se o limit acaba, o insert nunca acontece.
5. **Impersonação auditada** — sessão em cookie separado + banner amarelo obrigatório em todo layout autenticado + linha em `impersonation_sessions` + `security_events`.
6. **Signup self-serve** — 14 dias de trial no plano Starter, sem cartão. Onboarding em 6 etapas.

## Migration 0039

| Tabela / mudança | Propósito |
|---|---|
| `organizations` +slug/+plan_id/+subscription_status/+trial_ends_at/+owner_id/+suspended_at/+branding/+custom_domain/+health_score | Tenant como cidadão de primeira classe |
| `profiles.platform_role` | Separação plataforma × tenant admin |
| `is_platform_admin()` RPC | Helper SECURITY DEFINER usado em RLS |
| `plans` + seed (Starter/Professional/Business/Enterprise) | Catálogo de planos com limites por métrica + `features` jsonb |
| `subscriptions` + `subscription_events` | Assinatura ativa + audit trail |
| `invoices` + `invoice_items` + `payment_methods` | Faturamento |
| `feature_flags` + `feature_flag_overrides` + `check_feature_flag()` | Cascata user → role → tenant → plan → default |
| `tenant_usage_counters` + `increment_usage()` | Enforcement de limites por período |
| `tenant_domains` | White-label / custom domain |
| `team_invitations` | Convites com token expirável |
| `impersonation_sessions` | Suporte com auditoria completa |
| `support_tickets` + `support_ticket_messages` | Central de suporte |
| `data_export_requests` + `data_deletion_requests` | LGPD art. 18 |
| `user_totp_secrets` + `security_events` | 2FA + logs de segurança |
| Feature flags iniciais | `ai.image_analysis`, `portal.custom_domain`, `security.2fa_required`, `billing.self_upgrade`, ... |

## Camadas novas em `src/lib`

### `src/lib/billing/`
- `types.ts` — `BillingProvider`, `CreateCheckoutInput`, `WebhookEvent`
- `providers/mock.ts` — auto-confirma, útil em dev + planos "sob consulta"
- `providers/stripe.ts` — checkout + webhook (HMAC-SHA256 validado)
- `registry.ts` — `resolvePlatformBillingProvider()` + `activateSubscription()` (persistência da mudança)

### `src/lib/features/resolver.ts`
- `isFeatureEnabled(key, ctx)` — resolve uma flag
- `resolveFeatureFlags(keys, ctx)` — batch

### `src/lib/limits/enforcement.ts`
- `checkLimit(org, metric)` — read-only
- `assertWithinLimit(org, metric)` — throws com mensagem PT-BR quando limite atingido
- `incrementUsage(org, metric, delta)` — RPC atômica

### `src/lib/branding/resolver.ts`
- `resolveBranding()` — para caller autenticado
- `resolveBrandingForOrg(orgId)` — para páginas públicas por domínio

### `src/lib/permissions/platform.ts`
- `getPlatformUser()` / `requirePlatformUser()` — usados em toda rota `/super-admin/*`

## Rotas novas

### `/super-admin/*` (guard: `platform_role`)
- `/super-admin` — visão geral (KPIs plataforma: tenants, MRR, users)
- `/super-admin/tenants` — lista + `/[id]` com ações (suspender, reativar, mudar plano, impersonar)
- `/super-admin/planos` — catálogo (cards com todos os limites)
- `/super-admin/assinaturas` — tabela de todas as subscriptions
- `/super-admin/faturamento` — invoices globais
- `/super-admin/features` — feature flags + overrides
- `/super-admin/suporte` — todos os tickets abertos
- `/super-admin/logs` — security_events cross-tenant
- `/super-admin/status` + `/super-admin/jobs` — reutilizam observabilidade da Fase 5
- `/super-admin/usuarios` — todos os usuários da plataforma
- `/super-admin/configuracoes` — env expected

### Tenant (`/hub`)
- `/signup` (público) — self-serve signup + 14d trial
- `/onboarding` — wizard 6 etapas
- `/branding` — logo, cores, favicon, saudação
- `/dominios` — white-label / custom domain
- `/equipe` — convites com token
- `/billing` + `/billing/success` — plano atual + upgrade
- `/lgpd` — export + solicitação de exclusão
- `/suporte` — abertura de ticket

### API
- `POST /api/webhooks/billing/{provider}` — Stripe hoje, extensível

Middleware carve-out para `/api/webhooks/*` (auth por HMAC, não por cookie).

## Fluxo do signup

1. Usuário preenche `/signup` (empresa, slug, admin, senha)
2. `signupTenantAction`:
   - Rate-limit por IP (5/min)
   - Cria `auth.user` com email confirmado
   - Cria `organizations` (status=trial, trial_ends_at=+14d)
   - Cria `profile` (role=admin)
   - Cria `subscription` (status=trial, plan=Starter)
   - Registra `subscription_events.created` + `security_events.signup_completed`
   - Insere `system_settings.onboarding_progress`
3. Redireciona para `/login?welcome=1`

## Fluxo do checkout

1. `/billing` — usuário escolhe plano + cycle
2. `startCheckoutAction` — provider retorna `hostedUrl` (Stripe checkout ou mock success page)
3. Provider externo processa + notifica webhook `/api/webhooks/billing/stripe`
4. `parseWebhook` valida HMAC → `activateSubscription`:
   - `organizations.subscription_status = 'active'`, `plan_id` atualizado
   - `subscriptions` upsert com novo período
5. Redireciona para `/billing/success`

## Fluxo da impersonação

1. Platform admin abre `/super-admin/tenants/[id]`, informa motivo, clica "Impersonar"
2. `startImpersonationAction`:
   - Cria `impersonation_sessions` (actor, target, reason, IP, UA)
   - `security_events.impersonation_started`
   - Seta cookie `sr_impersonation` (httpOnly, 2h TTL)
3. Redireciona para `/dashboard` — todo layout mostra banner amarelo
4. `stopImpersonationAction` (do banner) — encerra sessão + limpa cookie

## Enforcement de limites (exemplo)

```ts
// src/features/cases/actions.ts
await assertWithinLimit(profile.organization_id, 'cases_month');
const { data } = await supabase.from('cases').insert({ ... });
await incrementUsage(profile.organization_id, 'cases_month', 1);
```

Se o tenant estiver no plano Starter (50 casos/mês) e já criou 50, o `assertWithinLimit` lança:
> "Limite de cases_month do seu plano atingido (50/50). Faça upgrade em /billing."

## LGPD

Duas ações principais (`requestDataExportAction`, `requestDataDeletionAction`):
- Export: cria `data_export_requests`, processor async gera ZIP (a implementar em job kind `data_export`), URL assinada por 7 dias.
- Deletion: cria `data_deletion_requests` com `scheduled_at = now + 30 days`. Job diário executa exclusão dos vencidos.

## Environment novas

```
CRON_SECRET=<random>
STRIPE_SECRET_KEY=sk_test_...          # opcional
STRIPE_WEBHOOK_SECRET=whsec_...        # opcional
STRIPE_PRICE_STARTER_MONTHLY=price_... # por plano+cycle
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_PROFESSIONAL_MONTHLY=...
... (etc)
NEXT_PUBLIC_APP_URL=https://app.srdigital.com.br
```

## Segurança — checklist Fase 6

- [x] Middleware guarda `/super-admin/*` por `platform_role`
- [x] RLS strict em todas as novas tabelas
- [x] Convites com token expirável (7 dias)
- [x] API keys já hasheadas (Fase 5) + auditoria em `security_events`
- [x] Impersonação com audit completa + banner obrigatório
- [x] Webhook HMAC validado (Stripe)
- [x] Rate-limit por IP no signup (5/min)
- [ ] 2FA (base criada com `user_totp_secrets`, UI adiada)
- [ ] Sessions ativas listáveis (adiado para próxima iteração)

## Roadmap pós-Fase 6

- 2FA UI + enforcement via `security.2fa_required` flag por role/tenant
- SSO SAML/OIDC (feature flag `sso` do plano Enterprise)
- Processor job `data_export` — gera ZIP e envia signed URL
- Processor job `data_deletion` — executa exclusão programada
- Custom domain: rota reverse-proxy `[hostname]/portal` resolve tenant por `custom_domain` ou subdomínio de `tenant_domains`
- Adaptadores billing: Mercado Pago, Asaas, Iugu, Pagar.me
- Painel de saúde por tenant (health_score algorithm)
