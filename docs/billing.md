# Billing

## Provedores suportados

- **Stripe** (real, produção)
- **Mock** (dev / testes; auto-ativa assinatura sem cobrar)

Adicionar novos: implementar `BillingProvider` em `src/lib/billing/providers/` — Mercado Pago, Asaas, Iugu, Pagar.me podem ser plugados sem tocar em nenhum consumer.

## Configuração de planos

Cada plano vive em `public.plans` (seed em migration 0039):
- Precos: `monthly_price`, `yearly_price`
- Limites: `max_users`, `max_clinics`, `max_dentists`, `max_cases_month`, `max_storage_gb`, `max_ocr_month`, `max_ai_tokens_month`, `max_api_calls_month`, `max_automations`, `max_webhooks` (null = ilimitado)
- Features: jsonb com booleans (`api_access`, `white_label`, `custom_domain`, `priority_support`, `sso`, `advanced_reports`, ...)
- Stripe: `stripe_price_id_monthly`, `stripe_price_id_yearly` (opcional; fallback para env `STRIPE_PRICE_{CODE}_{CYCLE}`)

## Fluxos

### Checkout
1. Tenant chama `checkoutAction({ plan_code, cycle })`
2. `startCheckoutForOrg` cria (ou reusa) Stripe customer, resolve price id, cria Checkout Session
3. Redireciona para hosted URL
4. Após pagamento, Stripe → webhook `checkout.session.completed` + `customer.subscription.created`
5. Webhook handler grava `subscriptions` + atualiza `organizations.subscription_status='active'`

### Customer Portal
1. Tenant chama `openCustomerPortalAction()`
2. `openCustomerPortal` cria Portal Session
3. Redireciona; cliente gerencia pagamento, cancela, altera dentro do Portal
4. Mudanças voltam via webhooks

### Upgrade / Downgrade
1. `changePlanAction({ plan_code, cycle })`
2. `stripeUpdate` com `proration_behavior=create_prorations` (default) → fatura pro-rata
3. Webhook `customer.subscription.updated` atualiza DB

### Cancelamento
- `cancelAtPeriodEndAction()` → `cancel_at_period_end=true` (mantém acesso até fim)
- Cancelamento imediato via Customer Portal

## Idempotência

`billing_events` tem unique `(provider, external_event_id)`. Se Stripe reenviar o mesmo evento, o handler retorna 200 sem re-processar.

## Ciclo de inadimplência

Cron `dunning-tick` avança automaticamente:

| Dias após payment_failed | Stage | Efeito |
|---|---|---|
| 0-2 | 1 | Notifica proprietário, sem restrição |
| 3-6 | 2 | Banner + bloqueia automações não essenciais |
| 7-14 | 3 | `blocked_dunning` — bloqueia criação de novos casos |
| 15-29 | 4 | `readonly_dunning` — modo somente leitura |
| 30+ | 5 | `suspended` — bloqueia acesso |

Dados **nunca** deletados por inadimplência.

## Auditoria financeira

- Toda mudança de assinatura → `subscription_events` (created/upgraded/downgraded/cancelled)
- Toda fatura → `invoices` + `invoice_items`
- Todo webhook → `billing_events` (payload sanitizado)
- Alertas de falha → `operational_alerts` + notification channels
