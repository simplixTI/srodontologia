# Go-live · Checklist

Checklist objetiva para promoção do sistema para produção. Cada item tem status claro: ✅ pronto no código · ⚙️ requer configuração externa · ❌ ainda não feito.

## Código
- ✅ Typecheck limpo (`npx tsc --noEmit`)
- ✅ Build OK (`npm run build`)
- ✅ Zero `console.log` em código de features (usar `logger` estruturado)
- ✅ CI configurado (`.github/workflows/ci.yml`)
- ⚙️ Runner de CI conectado (GitHub Actions habilitado no repo)

## Banco de dados
- ✅ Migrations 0001-0040 aplicadas
- ⚙️ Backups Supabase confirmados diários (painel do projeto)
- ⚙️ PITR habilitado (Supabase Pro tier)
- ⚙️ RLS testada em produção contra role autenticado
- ⚙️ Roles do banco separadas (dev/prod)

## Auth + segurança
- ✅ RLS strict em todas as tabelas de negócio
- ✅ 2FA disponível em `/perfil/seguranca`
- ⚙️ TOTP obrigatório para admins (setar flag `security.2fa_required` por tenant)
- ✅ Rate-limit em signup/login/upload/mensagens
- ⚙️ `TOTP_SECRET_KEY` setado (32+ chars aleatórios)
- ✅ Security headers no `next.config.mjs`
- ⚙️ Vercel Firewall ativado
- ❌ CAPTCHA em `/signup` e `/forgot-password` (recomendado antes de tráfego alto)

## Billing (Stripe)
- ✅ Handler idempotente + HMAC + timestamp tolerance
- ⚙️ `STRIPE_SECRET_KEY` (live)
- ⚙️ `STRIPE_WEBHOOK_SECRET` (live)
- ⚙️ Endpoint webhook cadastrado no Stripe Dashboard
- ⚙️ Eventos assinados: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`, `charge.refunded`
- ⚙️ Price IDs cadastrados em `plans.stripe_price_id_monthly/yearly` (ou env fallback)
- ⚙️ Products no Stripe casando com nossos plan codes
- ⚙️ Tax configurado no Stripe (se aplicável)
- ⚙️ Portal do cliente customizado (branding + features permitidas)

## Domínio + SSL
- ⚙️ Domínio principal apontando para Vercel
- ⚙️ SSL provisionado
- ⚙️ HSTS preload aceito (após 6 meses estável)
- ⚙️ Subdomínios reservados protegidos (código já bloqueia)

## E-mail
- ⚙️ `EMAIL_API_KEY` + `EMAIL_FROM` setados
- ⚙️ Provider configurado (Resend / Postmark / SendGrid / SES)
- ⚙️ SPF configurado
- ⚙️ DKIM configurado
- ⚙️ DMARC configurado (política `quarantine` ou `reject`)
- ⚙️ Subdomínio transacional dedicado (ex: `mail.srdigital.com.br`)
- ❌ Templates revisados por marketing/design final

## Jobs + workers
- ✅ Retry + backoff + dead-letter funcionais
- ✅ Cron lock impede execução dupla
- ⚙️ Vercel Cron habilitado com `/api/cron` a cada minuto
- ⚙️ `CRON_SECRET` setado (32+ chars)
- ✅ Painel `/super-admin/jobs` com reprocessar/cancelar
- ✅ Alertas automáticos em dead-letter

## LGPD
- ✅ Solicitação + processador de exportação
- ✅ Solicitação + processador de deleção (30d graça)
- ✅ Anonimização preferida a deleção
- ⚙️ Termos de Uso publicados
- ⚙️ Política de Privacidade publicada
- ⚙️ Contato DPO configurado
- ⚙️ Registro de operações de tratamento (ROP) mantido externamente

## Monitoramento
- ✅ `/api/health` (liveness)
- ✅ `/api/health/ready` (readiness com checks reais)
- ✅ `/super-admin/status` com dados reais
- ⚙️ `SENTRY_DSN` setado (ou equivalente)
- ⚙️ Alerta configurado para queda de `/api/health/ready` (external uptime monitor)
- ⚙️ Channels de notificação configurados (Slack/Discord/Teams)

## Rate limit
- ✅ In-memory funciona para dev
- ⚙️ `UPSTASH_REDIS_REST_URL/TOKEN` setados para produção multi-instância

## Ambiente
- ✅ `.env.example` documentado
- ✅ `src/lib/env.ts` valida obrigatórios
- ⚙️ Envs de produção separadas de preview
- ⚙️ Chaves de produção nunca em preview

## Suporte
- ✅ `/suporte` para abertura de tickets
- ✅ `/super-admin/suporte` para operação
- ⚙️ Email de suporte configurado (ex: `suporte@srdigital.com.br`)
- ⚙️ SLA de resposta definido e comunicado

## Testes
- ✅ Testes unitários (`npm test`) — totp, cpf, rate-limit, stripe signature
- ❌ Testes E2E (Playwright) — não implementados
- ⚙️ Smoke test manual em staging documentado

## Documentação
- ✅ 11 documentos criados
- ✅ Runbooks básicos
- ✅ Progress.md atualizado

## Rollback
- ✅ Deploys anteriores mantidos pela Vercel
- ✅ Documentado em `docs/deployment.md`
- ❌ Down migrations (não fazemos por design; documentar estratégia manual)

## Responsáveis (a preencher)
- Owner técnico: __________________
- Contato de emergência: __________________
- Contato Stripe: __________________
- Contato Supabase (suporte): __________________

## Aprovação final

Somente marcar como **PRONTO PARA PRODUÇÃO** após TODOS os itens ⚙️ e ❌ terem sido resolvidos ou aceitos formalmente como risco conhecido.
