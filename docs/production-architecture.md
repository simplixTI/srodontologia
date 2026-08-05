# Arquitetura de produção

## Visão geral

```
                    Browser (public + tenant hosts)
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   custom.example.com   acme.srdigital.com.br   app.srdigital.com.br
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              │
                          Vercel Edge
                              │
             Next.js middleware (Supabase session refresh)
             + hostname resolver → tenant scope
                              │
                              ▼
                        Route handlers
              ┌───────────────┼───────────────┐
              │               │               │
         Server Actions   API v1        Webhook receivers
         (RLS as user)   (Bearer)       (HMAC)
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                     Supabase (Postgres + Auth + Storage)
                              │
                              ▼
                         RLS strict
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        Job Queue      Domain Events      Storage
        (jobs table)   (domain_events)    (buckets)
              │
      Vercel Cron → /api/cron → processNextJob()
             │
             ├─ webhook_deliver (HMAC + retry)
             ├─ email_send (outbox)
             ├─ ocr_document
             ├─ ai_* (providers)
             ├─ pdf_generate_*
             ├─ lgpd_export/deletion
             └─ domain_verify (dns.resolveTxt)
```

## Camadas de segurança

1. **HTTPS + HSTS** (Vercel)
2. **Middleware** — session refresh, route guards por role, hostname resolution
3. **Route handlers** — validação Zod + rate-limit distribuído
4. **Server Actions** — sempre chamam `requireX()` guards → RLS aplica automático (auth.uid)
5. **RLS** — última linha de defesa; SECURITY DEFINER RPCs para operações que precisam bypass controlado
6. **Service role** — apenas em `createSupabaseAdminClient()` (server-only import)
7. **Secrets** — apenas em env vars server; `NEXT_PUBLIC_*` são os únicos que vão para bundle

## Multi-tenant

- Toda tabela de negócio tem `organization_id uuid references organizations(id)`
- RLS policies filtram por `current_user_organization_id()` (SECURITY DEFINER helper)
- Enforcement de limites em server actions críticas via `assertWithinLimit(org, metric)`
- Isolamento em Storage por path convention (`<organization_id>/...`)
- White-label + hostname resolution: um único deploy serve N tenants

## Modelo de dados (nova camada Fase 7)

- `billing_events` — idempotência de webhook (unique `provider + external_event_id`)
- `cron_runs` — histórico + lock (unique index `WHERE status='running'`)
- `email_outbox` + `email_events` — envio + tracking
- `notification_channels` — Slack/Discord/Teams/webhook por org ou plataforma
- `operational_alerts` — cria automaticamente em falhas críticas
- `dunning_policies` — configuração de política de inadimplência (default aplicado)

Ver `docs/database.md` (Fase 1) para o modelo completo.

## Ambientes

- **Local** — Supabase local (opcional) ou projeto de dev compartilhado. Stripe test mode.
- **Preview** — deploy por PR na Vercel. Env `DEPLOY_ENV=preview`. Stripe test mode.
- **Staging** — Supabase próprio + billing test + webhook próprio.
- **Production** — Supabase próprio + Stripe live + custom domains.

Nunca compartilhar `STRIPE_SECRET_KEY` de produção com preview.
