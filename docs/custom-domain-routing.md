# Roteamento por hostname (custom domains)

## Arquitetura

```
Request → Edge middleware (edge runtime, sem DB)
             ↓
  normaliza + valida host
  injeta x-sr-hostname header
             ↓
Server Component (Node runtime)
  chama resolveTenantFromHostname(headers().get('x-sr-hostname'))
  consulta tenant_domains + organizations
  aplica tenant scope (branding, links, etc)
```

## Por que dividir em 2 camadas?

- Middleware roda no edge runtime — não pode hitar Supabase diretamente.
- Layouts SSR rodam em Node — podem consultar DB.
- Passar via header mantém o resolver **puro** e edge-safe caso mudemos.

## Prioridade da resolução

1. **Custom domain verified** — `tenant_domains.hostname = X, status IN (verified|active|ssl_active)`
2. **Subdomain oficial** — `<slug>.<APP_URL>` → `organizations.slug`
3. **null** — fallback para experiência da plataforma (marketing/signup)

## Segurança

- **Host header injection**: middleware rejeita hostnames com chars fora de `/^[a-z0-9.-]+$/`.
- **Reserved subdomains** (`www`, `app`, `api`, `admin`, `portal`, `dashboard`, `super-admin`, ...): nunca resolvem para tenant.
- **Cache 30s** por hostname em processo. Invalidação automática pela política de TTL; para forçar, redeploy.
- **Custom domain in progress**: só resolve quando `status IN (verified|active|ssl_active)` — nunca em `pending` ou `awaiting_dns`.

## Cron de revalidação

`revalidateDomainsTick` roda dentro do `/api/cron`:
- domínios `pending`/`awaiting_dns`/`verifying`: revalida a cada 15min
- domínios `verified`/`active`/`ssl_active`: 1x/dia
- falhas consecutivas: backoff exponencial (15min * 2^n até 24h)
- 3+ falhas: alerta `operational_alerts` `severity=warning`

Cada revalidação escreve em `domain_verification_history` com `prev_status`/`new_status`/`error`.

## Estados do domínio

| Estado | Significado |
|---|---|
| `pending` | Recém criado, aguardando instrução do usuário |
| `awaiting_dns` | Usuário instalou TXT, aguardando propagação |
| `verifying` | Revalidação em andamento |
| `verified` | TXT confirmado — mas SSL ainda não emitido |
| `provider_pending` | Registro criado no provider de hosting |
| `ssl_pending` | Certificado sendo emitido |
| `ssl_active` | SSL ativo — pode servir tráfego |
| `active` | Alias de `ssl_active` para compat |
| `failed` | Última verificação falhou |
| `disabled` | Cliente desativou manualmente |

## Wiring futuro (declarado pendente)

- **Vercel Domains API**: adicionar `src/lib/domains/providers/vercel.ts` que cria/remove domínio via API + monitora emissão SSL.
- **Cloudflare**: alternativa se hospedagem mudar.
- **Reverse proxy real por hostname**: middleware não faz rewrite hoje — todos os hosts servem a mesma app; distinção é feita via branding + tenant scope. Adicionar rewrite `hostname === custom_domain → /portal/*` quando ativar portal-only domains.
