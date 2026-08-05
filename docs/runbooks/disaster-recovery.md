# Runbook · Disaster Recovery

## Severity levels

- **P0** — Sistema fora do ar OU dados corrompidos afetando > 10% tenants
- **P1** — Feature crítica quebrada (login, checkout, criação de caso)
- **P2** — Feature secundária quebrada
- **P3** — Bug cosmético

## Cenários

### Exclusão acidental de dados (P0/P1)

Se um `DELETE` ou migration destrutiva foi rodada:

1. **NÃO** faça mais escritas
2. Ative modo de manutenção (retornar 503 via feature flag ou banner)
3. Acesse Supabase → Backups → escolha o snapshot anterior à exclusão
4. Restaure em projeto secundário (nunca sobrescrever direto)
5. Compare tabelas afetadas; extraia registros perdidos via `pg_dump` + `pg_restore --data-only --table=X`
6. Re-injete no projeto principal
7. Audite via `security_events` para entender o que causou
8. Post-mortem obrigatório

### Migration defeituosa (P0)

1. Rollback do deploy no Vercel (imediato)
2. Se a migration adicionou coluna, é reversível (drop opcional)
3. Se a migration alterou dados, RESTAURAR do último backup
4. **Nunca** rodar `DROP TABLE` / `TRUNCATE` sem backup fresco confirmado

### Corrupção de dados (P0)

1. Identificar escopo (tenant? tabela? row range?)
2. Isolar via feature flag ou suspender tenant específico
3. Restaurar do backup pontual mais recente
4. Comparar `updated_at` para reconciliar escritas pós-corrupção

### Falha de provider (P1)

**Stripe fora:**
- Signup + billing quedam
- Cases + core do produto seguem operando
- Mostrar banner nos fluxos de billing
- Retomar quando back online — webhooks reenviarão eventos

**Supabase Auth fora:**
- Sistema fica indisponível
- Nada a fazer além de esperar (post na status page)
- Após retorno, sessões existentes devem renovar automaticamente

**Storage fora:**
- Uploads falham + previews de arquivo falham
- Cases + textos seguem funcionando
- Mostrar banner + degradar features de arquivo

### Vazamento de segredo (P0)

1. Rotacionar imediatamente:
   - `SUPABASE_SERVICE_ROLE_KEY` (via painel)
   - `STRIPE_SECRET_KEY` (via Stripe dashboard)
   - `STRIPE_WEBHOOK_SECRET` (recriar endpoint)
   - `CRON_SECRET` (gerar novo, atualizar env)
   - `TOTP_SECRET_KEY` (⚠️ RE-CRIPTOGRAFAR todos os user_totp_secrets)
2. Atualizar Vercel envs
3. Redeploy imediato
4. Auditar `security_events` + logs
5. Notificar usuários se dados foram acessados (obrigação LGPD)

## Comunicação durante incidente

- Status page interna: atualizar `operational_alerts` como `critical`
- Slack #incidentes
- Se P0 > 30min: e-mail a todos os admins de tenants ativos
- Post-mortem público em até 7 dias
