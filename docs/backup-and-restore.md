# Backup e restauração

**Status honesto:** Não temos rotina de backup **automatizada pelo nosso código**. Dependemos dos backups gerenciados pelo Supabase + Storage. Este documento cobre a configuração externa necessária + runbook de restore.

## Estratégia

### Banco (Postgres)

**Provedor:** Supabase — backups gerenciados.

**Config necessária:**
- Painel Supabase → Project Settings → Database → Backups
- Free tier: backups diários com 7 dias de retenção
- Pro tier: backups diários + PITR (Point-in-Time Recovery) até 7 dias
- Recomendado para produção comercial: **Pro tier**

**Frequência:** diária (automática)
**Retenção:** 7 dias (Free) / 30 dias (Pro custom)
**Região:** mesma do projeto principal

**Restore:**
1. Painel Supabase → Backups → escolher snapshot
2. Restore no mesmo projeto OU criar novo projeto e restaurar (recomendado para validar)
3. Trocar env `SUPABASE_URL` e `SERVICE_ROLE_KEY` se necessário
4. Após restore: rodar `/api/health/ready` para validar

### Storage (buckets)

**Provedor:** Supabase Storage.

**Backup:** ainda não implementado. Buckets NÃO são incluídos no backup automático do Postgres.

**Ação recomendada pré-go-live:**
- Configurar CRON externa (GitHub Actions ou Vercel Cron adicional) que:
  1. Lista todos os buckets
  2. Copia para bucket S3/R2 secundário via `supabase.storage.listObjects` + `download` + upload
  3. Retém por 30 dias

Ver `docs/runbooks/disaster-recovery.md` para detalhes.

### Configurações

- Segredos: gerenciados no Vercel env — não fazem backup pelo Supabase
- Ação: **exportar env do Vercel semanalmente** e guardar em vault seguro (1Password, Bitwarden)

## RPO / RTO

**Metas iniciais** (validar com testes reais antes de garantir para clientes):

- **RPO** (perda máxima de dados): 24h no plano Free do Supabase; 5min com PITR no Pro
- **RTO** (tempo máximo de recuperação): 4h com procedimento manual documentado

## Teste de restore

**Cadência recomendada:** trimestral.

1. Criar projeto Supabase secundário
2. Restaurar snapshot mais recente
3. Rodar smoke test (login + dashboard + criar caso)
4. Documentar tempo real e discrepâncias
5. Excluir projeto secundário

**Última execução:** _não realizada — obrigatório antes do go-live comercial_

## Runbook: exclusão acidental de dados

Ver `docs/runbooks/disaster-recovery.md`.

## O que NÃO alegar

- ❌ "Temos backups automáticos com retenção de 30 dias" — falso hoje
- ❌ "RPO 5min" — só com Supabase Pro configurado
- ❌ "Backup em outra região" — não configurado

O que **podemos** alegar:
- ✅ "Dados armazenados em provedor gerenciado com backup diário"
- ✅ "Procedimento documentado de restauração"
- ✅ "Auditoria completa via `audit_logs` para reconstrução parcial"
