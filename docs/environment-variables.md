# Variáveis de ambiente

Schema completo em [src/lib/env.ts](../src/lib/env.ts). Copiar `.env.example` para `.env.local` no dev.

## Server-only (nunca no bundle)

| Nome | Obrigatório | Observação |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ sempre | Nunca commitar. Rotacionar em incidente. |
| `CRON_SECRET` | ✅ prod | Bearer usado pelo Vercel Cron |
| `STRIPE_SECRET_KEY` | ✅ prod | Sem ela, checkout roda em mock |
| `STRIPE_WEBHOOK_SECRET` | ✅ prod | HMAC validado em cada evento |
| `STRIPE_PRICE_*_MONTHLY/YEARLY` | opcional | Fallback quando não gravado em `plans` |
| `EMAIL_API_KEY` | ⚠️ prod | Sem ela emails vão para log |
| `EMAIL_FROM` | ⚠️ prod | Ex.: `no-reply@srdigital.com.br` |
| `EMAIL_PROVIDER` | opcional | `resend` \| `sendgrid` \| `postmark` \| `ses` |
| `UPSTASH_REDIS_REST_URL` + `..._TOKEN` | opcional | Rate-limit distribuído — sem eles cai para in-memory |
| `SENTRY_DSN` | opcional | Sem ele, erros ficam só nos logs |
| `TOTP_SECRET_KEY` | ✅ prod | Chave usada para envelope-encrypt TOTP secrets |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GOOGLE_AI_API_KEY` / `OPENROUTER_API_KEY` | opcional | IA cai para mock sem eles |

## Client-safe (`NEXT_PUBLIC_*`)

| Nome | Obrigatório |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ |
| `NEXT_PUBLIC_APP_URL` | ⚠️ para links absolutos em emails |

## Validação

- `loadServerEnv()` — chamada em rotas server. Em prod, lança se faltar obrigatória.
- `loadClientEnv()` — chamada em client components. Em prod, lança se faltar `NEXT_PUBLIC_*`.
- `featureConfigured.{stripe,upstash,sentry,email}` — booleans consumidos pelos services.

## Rotação

- **Service role, Stripe, Webhook, Cron, TOTP key**: rotacionar imediatamente em incidente.
- **CDN/Vercel envs**: nunca aparecem em logs.
- **Nunca** commitar segredos, nem em migrations.
