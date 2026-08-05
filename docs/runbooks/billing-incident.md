# Runbook · Incidente de billing

## Cenários

### Webhook Stripe falhando

**Sintoma:** `/super-admin/alertas` mostra webhook_failure, `/super-admin/status` marca billing como degraded.

**Diagnóstico:**
1. Ver `billing_events` com `status='failed'` recentes
2. Verificar `error` — problema de assinatura HMAC? Timestamp? Parse?
3. Verificar Stripe Dashboard → Webhooks → nossa endpoint → últimas tentativas + response

**Correção:**
- Se HMAC: `STRIPE_WEBHOOK_SECRET` errado (comparar com Stripe Dashboard)
- Se timestamp: relógio do servidor errado (Vercel geralmente OK)
- Se parse: novo evento não reconhecido — adicionar ao dispatcher
- Reprocessar eventos via Stripe Dashboard → "Resend"

### Tenant pagou mas continua past_due

**Diagnóstico:**
1. `select * from subscriptions where organization_id = '<X>'` — external_ref presente?
2. `select * from billing_events where organization_id = '<X>' order by received_at desc` — evento `invoice.paid` recebido?
3. Stripe → cliente → assinatura → status

**Correção:**
- Se evento não veio: recriar webhook endpoint + testar com "Send test webhook"
- Se veio mas não processou: reprocessar via Dashboard OR marcar manualmente (`update organizations set subscription_status='active', dunning_stage=0 where id=X`)
- Auditar em `security_events` a mudança manual

### Cobrança duplicada

**Diagnóstico:**
1. Verificar `invoices` do tenant — duas com `paid_at` no mesmo período?
2. Stripe → cliente → invoices — quantas cobranças?

**Correção:**
- Se Stripe cobrou duas vezes: emitir refund via Stripe Dashboard
- Nunca fazer refund manualmente por SQL — sempre via Stripe (para reconciliação)

### Tenant reclama de suspensão indevida

**Diagnóstico:**
1. `select * from subscription_events where organization_id=X order by occurred_at desc`
2. `select * from billing_events where organization_id=X order by received_at desc`
3. Verificar dunning_stage e `dunning_last_event_at`

**Correção manual (após confirmar pagamento):**
```sql
update organizations
  set subscription_status='active',
      suspended_at=null,
      suspended_reason=null,
      dunning_stage=0
  where id = '<X>';
```

Registrar em `security_events`:
```sql
insert into security_events (organization_id, event_type, metadata)
values ('<X>', 'admin_reactivation', '{"reason":"manual_confirmation","ticket":"..."}');
```

### Stripe Product/Price desalinhado

**Sintoma:** checkout falha com "no price configured".

**Correção:**
- Verificar `plans.stripe_price_id_monthly/yearly` OU env `STRIPE_PRICE_{CODE}_{CYCLE}`
- Ambos precisam apontar para um `price` ativo no Stripe
- Se plano novo criado no super admin, cadastrar produto correspondente no Stripe manualmente
