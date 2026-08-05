# Release e rollback

## Estratégia de release

Deploy via Vercel push-to-deploy. Cada merge em `main` gera:
1. Preview deploy (PR)
2. Production deploy (após merge)

Migrations aplicadas via `npx supabase db push --include-all` **antes** do deploy — nunca ao mesmo tempo.

## Passos de release seguro

1. `git status` limpo
2. Rodar localmente:
   ```bash
   npx tsc --noEmit
   npm run test:run
   npm run build
   ```
3. Push da migration em produção (se houver)
4. Merge em `main`
5. Aguardar deploy Vercel completar
6. Rodar smoke: `E2E_BASE_URL=https://app.srdigital.com.br npm run smoke`
7. Se smoke falha → rollback imediato

## Rollback de código

Vercel dashboard → deployments → deploy anterior → "Promote to production".

Delay: ~30s. Não requer rebuild.

## Rollback de migration

**Migrations são forward-only** por design. Não temos `down.sql`.

Estratégias:

### Feature flag ao invés de rollback
Preferido. Novo código atrás de flag → desabilitar via `/super-admin/features` sem redeploy.

### Coluna nova nullable
Se a migration adicionou coluna, dá para deploiar código antigo (que ignora a coluna) sem problema. Coluna fica lá inutilizada.

### Migration destrutiva (raro)
Se migration deletou dado por engano:
1. Rollback do código imediato
2. Restore do banco (ver `docs/backup-and-restore.md`)
3. Post-mortem obrigatório

### Regra
Migrations que "renomeiam" ou "removem" colunas devem ser divididas:
1. Deploy 1: adiciona nova coluna, backfill em background
2. Deploy 2: aplicação passa a usar nova
3. Deploy 3 (semanas depois): remove antiga

## Rollback de billing

Se webhook Stripe processou algo errado:
1. Não deletar `billing_events` (idempotência quebra)
2. Reverter mutação manualmente via SQL (com aprovação)
3. Registrar em `security_events` a mudança manual
4. Reconciliar com Stripe Dashboard

Ver `docs/runbooks/billing-incident.md`.

## Rollback de domain

Se domínio custom parou de funcionar após alteração:
1. Marcar `disabled_at = now()` em `tenant_domains`
2. Cache LRU limpa em 30s
3. Tenant volta a acessar via subdomínio oficial
4. Ver `docs/runbooks/domain-incident.md`

## Rollback de feature (via flag)

```sql
-- Desabilitar feature X para todos os tenants imediatamente
insert into feature_flag_overrides (flag_key, target_type, target_id, enabled, reason)
values ('ai.image_analysis', 'tenant', '00000000-0000-0000-0000-000000000000', false, 'emergency_rollback')
on conflict do update set enabled = false, reason = excluded.reason;
```

Efeito imediato (SECURITY DEFINER RPC não cacheia por default).

## Comunicação

Rollback SEV-1: notificar todos os admins de tenants ativos via email + banner em `/status`.

Post-mortem público em até 7 dias.
