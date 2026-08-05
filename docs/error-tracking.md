# Error tracking

## Camadas

1. **Server-side** — `captureError` em `src/lib/observability/error-tracking.ts`. Sempre grava log JSON estruturado. Se `SENTRY_DSN` presente, envia envelope Sentry (implementação HTTP direta, sem SDK).
2. **Client-side** — `SentryLoader` (usa CDN loader.js oficial). Se `NEXT_PUBLIC_SENTRY_LOADER_SRC` presente, carrega ~2KB e captura automaticamente `window.onerror` + unhandled promise rejections.
3. **Error boundaries** — `error.tsx` em cada área (`hub`, `portal`, `super-admin`) + `global-error.tsx` como fallback. Emitem `Sentry.captureException` client-side + `console.error` sempre.

## Setup Sentry

1. Criar projeto em sentry.io
2. Copiar DSN → `SENTRY_DSN` no Vercel env (server-only)
3. Copiar Loader script URL do projeto → `NEXT_PUBLIC_SENTRY_LOADER_SRC` (client-safe)
4. Redeploy

Sem Sentry, tudo cai para logs estruturados JSON — Vercel captura stdout automaticamente.

## Redação de dados sensíveis

`captureError` chama `logger` internamente, que filtra automaticamente:
- password, secret, token, api_key, apikey
- authorization, cookie, set-cookie
- card, number, cvc, cvv
- ssn, cpf

Se precisar de contexto de tenant/user:
```ts
captureError(err, {
  route: '/casos/[id]/orcamentos',
  user_id: userId,
  tenant_id: orgId,
  extra: { case_id: caseId }
});
```

Nunca inclua clinical_description, patient_name ou payload bruto de webhook.

## Migração futura para @sentry/nextjs

Quando source-maps + tracing forem necessários:
1. `npm install @sentry/nextjs`
2. `npx @sentry/wizard@latest -i nextjs`
3. Remover `SentryLoader` (o SDK cuida)
4. Manter `captureError` com fallback para `Sentry.captureException`

Não implementado agora para manter bundle enxuto. Loader é suficiente para captura básica.

## Client error boundary

`ErrorFallback` gera código de referência (hash de `error.digest`) que aparece no log. Cliente relata → suporte busca no error tracking → resolve.
