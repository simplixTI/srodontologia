# Testes de segurança

Checklist de vulnerabilidades comuns e como validamos cada uma.

## Já testado (unitário)

- HMAC de webhook Stripe (validação de assinatura + timestamp + tampering) — `tests/stripe-signature.test.ts`
- TOTP (round-trip + backup codes) — `tests/totp.test.ts`
- Rate limit in-memory — `tests/rate-limit.test.ts`
- CPF validator — `tests/cpf.test.ts`

## Pendente de testes automatizados

### IDOR / bypass de RLS

Cenário: usuário A tenta ler dados de tenant B.

Teste manual (SQL contra staging):
```sql
-- Como usuário do tenant A:
select set_config('request.jwt.claims', '{"sub":"<uuid_a>"}', true);
select * from cases where organization_id = '<uuid_tenant_b>';
-- Deve retornar 0 rows (RLS aplicada)
```

Automatizar com fixture Playwright: seed 2 tenants, loga em A, tenta GET direto na API v1 com id de B → 404.

### Host header injection

Verificado em middleware: hostnames com chars fora de `/^[a-z0-9.-]+$/` retornam 400.

Teste manual:
```bash
curl -H "Host: evil.com\r\nX-Injected: 1" https://app.srdigital.com.br/
# Espera-se 400 ou header sanitizado
```

### Open redirect

Verificado em `safeRedirect`: URLs absolutas para hosts fora do allowlist são substituídas pelo fallback. Protocol-relative (`//evil.com`) rejeitado.

Test unit sugerido:
```ts
expect(await safeRedirect('//evil.com', '/dashboard')).toBe('/dashboard');
expect(await safeRedirect('/casos/123', '/dashboard')).toBe('/casos/123');
expect(await safeRedirect('https://malicious.com/x', '/dashboard')).toBe('/dashboard');
```

### CSRF

Next 14 Server Actions checam origin automaticamente. Supabase cookies são `SameSite=Lax`. Nenhum endpoint aceita mutations via GET.

### XSS

Todos os inputs de usuário são renderizados via React (escape automático). Emails usam `htmlEscape` em `src/lib/email/templates.ts`. Nunca usar `dangerouslySetInnerHTML` com dados de usuário.

### Upload MIME falso

Verificação por MIME + extensão no upload action. Content-type do storage é setado explicitamente. Sanitizar nomes para evitar path traversal (`..`, `/`).

### Path traversal

`storage_path` sempre construído server-side com `${orgId}/${caseId}/...` — nunca aceita path do usuário.

### SQL injection

Impossível via Supabase client (parametriza tudo). Nunca fazemos `raw()` com input do usuário.

### Session fixation

Supabase gera novo session id a cada login.

### Brute force

- Rate limit login: 8/5min por (IP, email)
- Rate limit signup: 5/min por IP
- CAPTCHA obrigatório em signup

### Enumeração de email

`/forgot-password` retorna sempre "email enviado" (verificar código). Signup retorna erro genérico para email duplicado.

### Replay de webhook

Idempotência: `billing_events` com unique `(provider, external_event_id)`. Timestamp tolerance 5min.

### SSRF

Nenhuma rota aceita URL arbitrária do usuário para fazer request server-side. Webhooks só POSTam para URLs cadastradas no admin da própria org.

### Bypass de Feature Flag / limite de plano

- Feature flag resolver é server-side (SECURITY DEFINER RPC).
- `assertWithinLimit` chamado em toda action que cria recurso limitado.
- Cliente não consegue burlar via chamada direta à API — server action valida.

## Ferramenta externa recomendada

- **OWASP ZAP** para varredura automatizada em staging (não em produção sem coordenação)
- **npm audit** já no CI

## Reportar vulnerabilidade

`seguranca@srdigital.com.br` (a configurar) — resposta em 48h úteis.
