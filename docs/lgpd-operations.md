# LGPD · Operações

Documento operacional para atender direitos dos titulares (LGPD art. 18).

## Exportação de dados

**Fluxo:**
1. Titular ou admin abre `/lgpd` → clica "Solicitar exportação"
2. Ação cria `data_export_requests` (status=pending) + enfileira job `lgpd_export`
3. Processor coleta dados autorizados:
   - Perfil e organização
   - Clínicas e dentistas
   - Casos (com scope customizável)
   - Mensagens, orçamentos, planejamentos, entregas
   - Arquivos (metadata; conteúdo via signed URL sob demanda)
   - Timeline de status
4. Bundle JSON gerado + upload no bucket `lgpd-exports` (path randomizado)
5. `expires_at = now + 7 days` — arquivo expira automaticamente
6. E-mail com URL assinada (template `lgpd_export_ready`)
7. Cada download incrementa `download_count` (limite 3)

**Retenção:** bundle é expirado 7 dias após geração. Não guardamos histórico de exports.

## Exclusão de dados

**Fluxo:**
1. Admin abre `/lgpd` → clica "Solicitar exclusão"
2. Ação cria `data_deletion_requests` com `scheduled_at = now + 30 days`
3. Período reversível de 30 dias — admin pode cancelar
4. Cron diário roda `processDeletionRequest` para requests vencidos

**Estratégia por escopo:**
- `scope=organization` — anonimiza dados PII (nome, email, documento, telefone, endereço, logo), define `deleted_at`, altera status para `cancelled`, anonimiza todos os users da org (locka contas via `ban_duration=87600h`)
- `scope=user` — anonimiza um usuário específico (email, nome, avatar)
- `scope=case` — deleta o caso (cascade cobre checklist/arquivos/mensagens/orçamentos/planejamento/entregas)

**O que NÃO é apagado (retenção legal):**
- `audit_logs` — preservado por 5 anos
- `security_events` — preservado por 2 anos
- `invoices`, `subscription_events`, `billing_events` — preservados por 5 anos (obrigação fiscal)
- Backups criptografados — reciclados naturalmente pela política de backup

## Consentimentos

Tabela `consents` da Fase 1 armazena o histórico de aceites. Nunca deletar linhas — anexar novas com novo timestamp.

## Base legal para tratamentos

Ver `Termos de Uso` e `Política de Privacidade` no site institucional. Casos clínicos: consentimento do titular (paciente) coletado pelo dentista via consentimento externo antes de subir dados ao SR Digital.

## Runbook de auditoria

Se um titular solicitar acesso aos dados dele (não da organização):
1. Confirmar identidade via email cadastrado + documento
2. Rodar `SELECT * FROM audit_logs WHERE user_id = ?` no super-admin/logs
3. Rodar `SELECT * FROM security_events WHERE user_id = ?`
4. Rodar `SELECT * FROM data_export_requests WHERE requested_by = ?`
5. Gerar pacote com scope=user via `/lgpd`

## DPO / responsável

- Contato: `dpo@srdigital.com.br` (a configurar)
- Prazo de resposta: 15 dias corridos (LGPD art. 19)
