# Deployment

## Vercel (recomendado)

### Setup inicial

1. Import do repo no Vercel (`https://vercel.com/new`)
2. Framework: Next.js (auto-detectado)
3. Env vars: importar `.env.example` como referência e preencher no dashboard
4. Node.js version: 20.x
5. Region: `gru1` (São Paulo) para menor latência com clientes BR

### Cron jobs

Adicionar `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron", "schedule": "* * * * *" }
  ]
}
```

Rota `/api/cron` exige `Authorization: Bearer $CRON_SECRET`. Vercel Cron envia automático.

### Webhooks

Após primeiro deploy:
- Stripe → adicionar endpoint `https://app.srdigital.com.br/api/webhooks/billing/stripe`
- Copiar `whsec_...` → `STRIPE_WEBHOOK_SECRET`
- Eventos: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`, `charge.refunded`

## Migrations

Aplicar antes do deploy:

```bash
npx supabase@latest db push --include-all
```

Migrations sempre forward-only. Regras:
- Colunas novas sempre `nullable` primeiro, backfill em lote, então `NOT NULL`
- Índices em produção: `CREATE INDEX CONCURRENTLY` quando > 100k rows
- Enum values novos: `ADD VALUE` (nunca `DROP VALUE`)
- Migration não deve travar por > 10s

## Deploy seguro (checklist rápido)

- [ ] `git status` limpo
- [ ] Migration 0040 já aplicada em prod
- [ ] Env vars atualizadas
- [ ] `STRIPE_WEBHOOK_SECRET` corresponde ao endpoint configurado
- [ ] Preview deploy testado com smoke test
- [ ] CI verde
- [ ] Nenhum `console.log` em código de produção (`grep -r "console.log" src/`)
- [ ] Backup de banco recente confirmado

## Rollback

Rollback de código: Vercel dashboard → deployment anterior → "Promote to production".

Rollback de migration: **manual**. Não temos `down.sql`. Estratégia:
1. Reverter deploy no Vercel
2. Rodar SQL manualmente para reverter (apenas se catastrófico)
3. Nunca `DROP` tabelas com dados — renomear + recriar
