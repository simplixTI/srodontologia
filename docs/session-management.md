# Gerenciamento de sessões

## Camada dupla

- **Supabase Auth** — fonte de verdade dos JWTs. Nunca substituímos.
- **`app_sessions`** — camada de visibilidade + revogação em cima. Guarda hash do refresh token + metadados do dispositivo.

## O que guardamos

Nunca guardamos: access token, refresh token, senha, IP em claro.

Guardamos:
- `session_hash` (sha256 do refresh_token id ou identificador estável)
- `user_agent` (500 chars max)
- `device_kind` (mobile/tablet/desktop/other — inferido do UA)
- `browser`, `os`
- `ip_hash` (sha256(ip + IP_HASH_SALT), truncado a 32 chars)
- `first_seen_at`, `last_seen_at`
- `revoked_at`, `revoke_reason`
- `expires_at` (ballpark de 30 dias)

## Fluxo

1. Login bem-sucedido → `recordSession()` insere/atualiza linha
2. Usuário acessa `/perfil/seguranca/sessoes` → lista sessões próprias
3. Revoga individualmente ou "encerrar todas"
4. `revoked_at` marcado + `security_events` `session_revoked` inserido

## Limitação honesta

Revogar em `app_sessions` **não invalida imediatamente o access token** do Supabase Auth (não temos API para isso). O que acontece:
1. Marcamos `revoked_at`
2. Próximo request do usuário: layouts SSR ainda vão validar via Supabase (token válido até TTL)
3. Quando o refresh token é usado (após ~1h), Supabase revalida e desconecta

Para revogação **imediata**, o próximo passo é adicionar um check no middleware:
```ts
// Pseudo — precisa cache para não pegar toda request
const { data } = await supabase.from('app_sessions')
  .select('revoked_at').eq('user_id', user.id).eq('session_hash', sessionHash);
if (data?.revoked_at) return NextResponse.redirect('/login?reason=revoked');
```

Não implementado por default para evitar 1 query DB por request. Habilitar via flag quando tenant tiver 2FA required.

## Alertas de novo dispositivo

Pendente. Padrão sugerido:
1. `recordSession` verifica se `(user_id, ip_hash)` já apareceu antes
2. Se não → enfileira email `security_alert` template
3. Contém "novo login detectado" + link revogar

Implementação em `docs/security-hardening.md`.

## Interface

`/perfil/seguranca/sessoes` (autenticada) mostra:
- Ícone do device
- Browser + OS
- Data primeiro acesso
- Data último acesso
- IP hash prefixo (transparência sem PII em claro)
- Botão revogar
- Histórico de revogações recentes
