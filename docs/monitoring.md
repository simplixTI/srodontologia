# Monitoramento

## Camadas

1. **Logs estruturados** — `logger` em `src/lib/observability/logger.ts` emite JSON. Vercel captura stdout automaticamente. Redação automática de campos sensíveis.
2. **Error tracking** — `captureError` em `src/lib/observability/error-tracking.ts`. Envia envelope Sentry se `SENTRY_DSN` setado; sempre grava log.
3. **Métricas de sistema** — via `/super-admin/status` (`getPlatformStatus`) e `/super-admin/observabilidade` (contadores de filas, eventos, IA).
4. **Health checks**:
   - `GET /api/health` — liveness (não toca DB, sempre retorna 200)
   - `GET /api/health/ready` — readiness (verifica DB + env obrigatórios; 503 se DB offline)
5. **Alertas** — `raiseAlert()` grava em `operational_alerts` + fanout via `notification_channels` (Slack/Discord/Teams/webhook)

## SLIs / SLOs iniciais

Metas de referência (baseline conservador — validar com dados reais):

| SLI | Meta |
|---|---|
| Disponibilidade mensal | 99.9% |
| Latência p95 API | ≤ 500ms |
| Latência p99 API | ≤ 1500ms |
| Webhooks processados (Stripe) | ≥ 99.5% |
| Jobs críticos processados | ≥ 99.5% |
| Erros server-side | ≤ 0.5% dos requests |
| Cron não executado (24h) | 0 |

## Onde ver o quê

- **Vercel** → deploys, logs, edge network
- **Supabase** → DB, Auth, Storage, RLS, backups
- **Stripe** → assinaturas, faturas, disputes
- **Sentry** (se configurado) → erros com stack
- **Painel super admin**:
  - `/super-admin/status` — status por serviço
  - `/super-admin/jobs` — fila, dead-letter
  - `/super-admin/alertas` — alertas operacionais
  - `/super-admin/observabilidade` — contadores
  - `/super-admin/logs` — security events cross-tenant
  - `/super-admin/faturamento` — invoices
  - `/super-admin/suporte` — tickets

## Configurando channels de alerta

1. `/super-admin` (ou tenant admin em `/notificacoes/canais` — TODO UI) insere em `notification_channels`:
   - `kind='slack'`, `target='https://hooks.slack.com/services/...'`
   - `events=[]` (todos) OU array de tipos `['billing_error', 'jobs_dead_letter']`
2. `raiseAlert()` fanout automático

## Playbook: taxa de erro > baseline

1. Ver `/super-admin/observabilidade` — qual feature está com erro?
2. `/super-admin/jobs?status=dead_letter` — houve pico?
3. Sentry → agrupar por `route`/`error_code`
4. Se billing → `/super-admin/faturamento` + `billing_events` com `status='failed'`
5. Rollback deploy se recente + investigar
