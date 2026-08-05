# Runbook · Incidente de domínio custom

## Cenário 1: Cliente reporta "meu domínio não funciona"

**Diagnóstico:**
1. Ver `tenant_domains` do tenant — qual status?
2. Ver `last_check_at` e `check_error`
3. `nslookup _sr-verify.<hostname>` — TXT existe?
4. `nslookup <hostname>` — CNAME aponta para nossa infra?
5. `curl -I https://<hostname>` — SSL válido? Retorna 404 ou 200?

**Causas comuns:**
- Cliente não adicionou TXT ainda (status pending/awaiting_dns)
- Cliente adicionou TXT mas não CNAME (status verified mas sem SSL)
- CNAME apontando errado
- SSL não provisionado (leva 5-30min após DNS OK)

**Correção:**
- Se falta TXT/CNAME: enviar instruções renovadas (`/dominios` mostra)
- Se DNS OK mas SSL não: aguardar 30min OU verificar painel Vercel/hosting
- Se pass todos os checks mas 404: tenant desativado (status suspended) — verificar billing

## Cenário 2: Domínio "hijack" (outro tenant tenta usar mesmo hostname)

**Prevenção:** unique index em `tenant_domains.hostname`

**Se acontecer:**
1. Verificar quando primeiro tenant adicionou vs segundo
2. Confirmar propriedade DNS (quem controla o CNAME?)
3. Contatar ambos os clientes
4. Manter o legítimo, remover o outro:
   ```sql
   delete from tenant_domains where id='<INVALID_ID>';
   ```

## Cenário 3: SSL expirando

Vercel gerencia renovação automática. Se falhar:
1. Vercel dashboard → Domains → renew
2. Fallback: cliente pode redirecionar temporariamente para subdomínio slug

## Cenário 4: Cliente quer migrar domínio

1. Cliente adiciona novo domínio (status pending)
2. Verifica DNS + valida
3. Mantém antigo até novo estar `active`
4. Marca antigo com `disabled_at=now()`:
   ```sql
   update tenant_domains set disabled_at=now(), status='disabled'
   where id='<OLD_ID>' and organization_id='<TENANT>';
   ```
5. Cache LRU do hostname resolver expira em 30s

## Comandos úteis

```sql
-- Todos os domínios de um tenant
select hostname, status, verified_at, last_check_at, check_error
from tenant_domains
where organization_id='<X>'
order by created_at desc;

-- Domínios com falha nos últimos 7 dias
select hostname, check_error, last_check_at
from tenant_domains
where last_check_at > now() - interval '7 days'
  and status not in ('verified','active');

-- Force reverify
-- via UI: `/dominios` clica em "Verificar" (enfileira domain_verify job)
```
