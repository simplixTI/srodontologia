# Runbook · Incidente de segurança

## Tipos comuns

- Credencial vazada (senha/token/API key)
- Conta comprometida (login suspeito)
- Ataque de força bruta detectado
- Escalação de privilégio (bypass RLS)
- Injection descoberta em produção

## Resposta imediata

1. **Contenção** (0-15min)
   - Vazamento de token → revogar imediatamente
   - Conta comprometida → forçar logout via `admin.updateUserById(id, { ban_duration })`
   - RLS bypass → deploy hotfix reverso ou desabilitar rota afetada
2. **Auditoria** (15-60min)
   - `security_events` da última semana → o que foi acessado?
   - `audit_logs` da conta/tenant afetado
   - `api_request_log` se envolveu API pública
   - `impersonation_sessions` para verificar acessos admin
3. **Notificação** (< 24h)
   - Titulares afetados via e-mail
   - ANPD se dados sensíveis vazaram (72h por LGPD)
   - Post-mortem público
4. **Correção**
   - Hotfix + testes + review de segurança
5. **Prevenção**
   - Adicionar teste de regressão
   - Se RLS bypass: revisar policies similares
   - Considerar bug bounty

## Comandos úteis

```sql
-- Últimos logins suspeitos (novo IP)
select * from security_events
where event_type in ('login_success','login_failed')
  and created_at > now() - interval '24 hours'
order by created_at desc;

-- Todos os acessos a um caso específico
select * from audit_logs
where table_name = 'cases' and record_id = '<CASE_UUID>'
order by created_at desc;

-- Impersonações ativas
select * from impersonation_sessions
where ended_at is null;
```

## O que NUNCA fazer

- Ocultar incidente para não gerar má imagem
- Deletar evidência (`security_events`, `audit_logs`)
- Notificar antes de conter (atacantes leem tudo)
- Reutilizar credenciais rotacionadas
