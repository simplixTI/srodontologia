# Domínios personalizados

## Fluxo do tenant

1. `/dominios` — admin adiciona `portal.exemplo.com.br`
2. Sistema gera token `sr-<hex>` e status `pending`
3. UI mostra o registro TXT para adicionar no DNS do cliente:
   ```
   Type: TXT
   Name: _sr-verify.portal.exemplo.com.br
   Value: sr-abc123...
   ```
4. Após propagação (5-30min), admin clica "Verificar"
5. Ação enfileira job `domain_verify`
6. Processor faz `dns.resolveTxt('_sr-verify.portal.exemplo.com.br')`, procura token
7. Se encontrar: `status='verified'`, `verified_at=now`
8. Se não: `status='verifying'`, `check_error=token_not_found`

## Ativação (SSL + roteamento)

Após `verified`, ainda precisa:
- Configurar CNAME `portal.exemplo.com.br → cname.vercel-dns.com` (ou equivalente)
- Adicionar domínio no Vercel/hosting
- SSL provisionado automaticamente (ACME)

Uma vez ativo, marcar `status='active'` no super admin (manual por enquanto — cron de re-check pendente).

## Reserva

Subdomínios reservados (nunca resolvem para tenant): `www`, `app`, `api`, `admin`, `super-admin`, `super`, `dashboard`, `portal`, `help`, `docs`, `status`, `signup`, `login`, `auth`, `mail`, `billing`.

## Segurança

- Host header nunca é confiado: `resolveTenantFromHostname` sempre valida contra a tabela
- Cache LRU em processo com TTL 30s
- Um mesmo hostname NÃO pode ser usado por dois tenants (unique index)
- Domínios em `disabled_at` não resolvem

## Runbook

- Cliente reporta "site fora do ar" em domínio custom:
  1. `nslookup portal.exemplo.com.br` — DNS aponta para nossa infra?
  2. `curl -I https://portal.exemplo.com.br` — SSL válido?
  3. Ver `tenant_domains.last_check_at` e `check_error`
  4. Verificar no painel do provider (Vercel) se domínio está registrado
- Cliente quer trocar de domínio:
  1. Adicionar novo domínio (status pending)
  2. Manter antigo até novo estar verified
  3. Marcar antigo com `disabled_at = now`
