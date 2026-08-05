# Hardening de segurança

## Headers (produção)

Configurados em `next.config.mjs`:

- `Content-Security-Policy` (whitelist: self + stripe.com + supabase + upstash + IA providers)
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), fullscreen=(self)`
- `X-DNS-Prefetch-Control: off`

## Auth

- Supabase Auth (JWT httpOnly cookies)
- Middleware refresh a cada request (`updateSession`)
- Role-based routing em middleware (INTERNAL, DENTIST, PLATFORM)
- Guards duplos em layouts (SSR) + server actions (`requireX`)
- 2FA TOTP disponível em `/perfil/seguranca` (RFC 6238)
- Backup codes com sha256, uso único
- TOTP secrets envelope-encrypted com `TOTP_SECRET_KEY`

## RLS

- Todas as tabelas de negócio: `ENABLE + FORCE` RLS
- Policies filtram por `current_user_organization_id()` (SECURITY DEFINER helper)
- Escritas de billing/webhooks/jobs: apenas via service role (writes têm policy `is_platform_admin()`)
- Views sanitizadas: `quotes_public` (esconde `internal_notes`)

## Rate limit

- In-memory por default (`src/lib/rate-limit.ts`)
- Distribuído via Upstash Redis se configurado (`src/lib/rate-limit-dist.ts`)
- Aplicado em: login (via Supabase Auth), signup (5/min por IP), upload (20/min), mensagens (60/min), CPF (30/min), OCR (10/min), search (60/min), IA (20/min), API pública (120/min por api key)

## Webhooks

- Stripe: HMAC-SHA256 + timestamp tolerance 5min
- Idempotência via `billing_events` (unique `provider + external_event_id`)
- Payload sanitizado antes de gravar (remove `card`, `cvc`, `number`, etc)

## Segredos

- Nunca no bundle client (garantido por `NEXT_PUBLIC_*` convention + review)
- `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` etc. apenas em `src/lib/**/admin.ts`, `stripe-client.ts`
- Todas as libs server marcadas com `import 'server-only'`
- Redação automática em logs (`logger` filtra keys `password`, `token`, `secret`, `authorization`, `card`, `cvc`, `ssn`, `cpf`)

## API pública

- Bearer token `sk_live_...`
- Armazenado como sha256 (`api_keys.key_hash`)
- Raw token exibido uma única vez ao criar
- Scopes validados por rota
- Rate-limit 120/min por api key
- Auditoria em `api_request_log`

## LGPD / Privacidade

- CPF nunca em claro (cache com `sha256(cpf)`)
- Anonimização preferida à deleção (preserva trilha financeira/auditoria)
- Grace period 30d para exclusão

## Auditoria

- `audit_logs` — todas as escritas críticas via triggers (migration 0035)
- `security_events` — login, senha, 2FA, sessão, impersonação, api_key
- `impersonation_sessions` — quem, quando, motivo, IP, UA + banner obrigatório em toda UI

## Anti-abuso

- Signup rate-limit por IP
- CAPTCHAs: pendente (adicionar via hCaptcha em `/signup` e `/forgot-password` antes de go-live comercial pesado)
- Enumeração de usuários: `/forgot-password` sempre retorna sucesso (verificar no código)
- Bloqueio automático após N falhas de login: pendente (Supabase Auth default é lenient — considerar edge function)

## Checklist de hardening pré-go-live

- [ ] TOTP obrigatório para papel `admin` + `super`
- [ ] `STRIPE_WEBHOOK_SECRET` rotacionado após primeiro deploy
- [ ] `SUPABASE_SERVICE_ROLE_KEY` restrito a Vercel prod env
- [ ] Alerta configurado para queda de `/api/health/ready`
- [ ] Vercel Firewall / bot protection ativado
- [ ] Backups Supabase confirmados diários
- [ ] Termos + Política de Privacidade publicados
