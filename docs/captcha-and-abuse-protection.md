# CAPTCHA e proteção adaptativa contra abuso

## Provider

Interface `CaptchaProvider` em `src/lib/captcha/types.ts`. Implementações:
- **Turnstile** (Cloudflare) — produção; requer `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`
- **Mock** — dev/CI; aceita token literal `e2e-bypass`

Resolução automática em `resolveCaptchaProvider()`: se Turnstile envs setadas → Turnstile; senão → Mock.

## Wire no server action

```ts
import { verifyCaptcha } from '@/lib/captcha/verify';

const captcha = await verifyCaptcha({
  token: formData.get('captcha_token')?.toString() ?? '',
  remoteIp: ip,
  context: 'signup',
  identifier: email
});
if (!captcha.ok) return { ok: false, error: 'Verificação de segurança falhou.' };
```

## Widget no client

```tsx
import { TurnstileWidget } from '@/components/captcha/TurnstileWidget';

<TurnstileWidget />  // renderiza o widget + injeta hidden input name="captcha_token"
```

Se `NEXT_PUBLIC_TURNSTILE_SITE_KEY` não estiver setada, o widget emite automaticamente o token `e2e-bypass` — assim testes E2E passam sem infra externa.

## Falhas registradas

Cada `captcha.verify.ok === false` cria linha em `security_events`:
- `event_type='captcha_failed'`
- `metadata.context`, `metadata.provider`, `metadata.error_codes`, `metadata.identifier` (email mascarado)

## Proteção adaptativa

`evaluateAbuseFor({ ip, email, windowMinutes })` consulta `security_events` (últimos 60min por default):
- 0-2 falhas → `requireCaptcha: false`
- 3-9 falhas → `requireCaptcha: true`
- 10+ falhas → `blocked: true` (o caller decide se aplica bloqueio + duração)

Uso sugerido em `/login`:
```ts
const abuse = await evaluateAbuseFor({ ip, email });
if (abuse.blocked) return { error: 'Muitas tentativas. Tente em 1h.' };
if (abuse.requireCaptcha && !captchaValid) return { error: 'Complete a verificação de segurança.' };
```

## Pontos wired atualmente

- ✅ `/signup` — obrigatório
- ⏳ `/forgot-password` — pendente (usar mesmo pattern)
- ⏳ Login retry — pendente (usar `evaluateAbuseFor` para exigir captcha após N falhas)

## Nunca

- Confiar no CAPTCHA client-side (validação sempre server-side em `verifyCaptcha`)
- Reutilizar tokens (Turnstile já rejeita tokens duplicados por design)
- Bloquear usuário legítimo permanentemente automaticamente
