# Jobs e Workers

## Fila

Tabela `public.jobs` com enum `job_status = queued | running | completed | failed | dead_letter | cancelled`.

Consumida pela RPC `dequeue_next_job(worker_id, kinds[])` que faz `FOR UPDATE SKIP LOCKED` — seguro para múltiplos workers concorrentes.

## Job kinds registrados

| Kind | Processor | Descrição |
|---|---|---|
| `webhook_deliver` | webhook.ts | POST HMAC + retry até 5 |
| `search_reindex` | search.ts | Snapshot + upsert em `search_index` |
| `automation_run` | automation.ts | Executa uma action de regra de automação |
| `email_send` | email.ts | Delega ao email provider (queued indirectly via outbox) |
| `whatsapp_send` | whatsapp.ts | Delega ao whatsapp provider |
| `ocr_document` | ocr.ts | Download + provider + persiste extraction |
| `ai_case_summary` | ai-case-summary.ts | Resumo IA + cache |
| `ai_prazo_prediction` | ai-prazo-prediction.ts | Estimativa estatística |
| `ai_lab_assistant` / `ai_dentist_assistant` / `ai_image_analysis` | stubs para batch |
| `pdf_generate_*` | pdf.ts | Renderer + upload + index |
| `lgpd_export` | lgpd.ts | Bundle → storage → URL assinada |
| `lgpd_deletion` | lgpd.ts | Anonimiza org/user OU deleta caso |
| `domain_verify` | domain.ts | `dns.resolveTxt` do token de verificação |

## Retry + Dead-letter

Backoff exponencial com jitter (±20%): 1min → 5min → 15min → 1h → 6h.

Após `max_attempts` (default 3), job vai para `dead_letter`:
- `dead_lettered_at` e `dead_letter_reason` preenchidos
- Alerta `operational_alerts` criado automaticamente
- Painel `/super-admin/jobs?status=dead_letter` permite **reprocessar** (reseta attempts) ou **cancelar**

## Idempotência

Cada processor deve ser idempotente. Guidelines:
- Chaves naturais: use `upsert` com `onConflict` sempre que possível.
- Verificar estado antes de escrever (ex: `if (already_processed) return`).
- Não usar `random()` para gerar identificadores que precisam ser reproduzíveis.

## Cron

`/api/cron` (executado a cada minuto pelo Vercel Cron):
1. Drena até 25 jobs (max 40s) — `processNextJob()` em loop
2. `scan-overdue-cases` (com lock)
3. `dunning-tick` (com lock)

Cron locks via `try_acquire_cron_lock(name, worker_id)` — unique index `WHERE status='running'` impede duas execuções paralelas do mesmo cron. Locks abandonados > 30min são recuperados automaticamente.

## Workers

- **Vercel Cron** (produção) — `/api/cron` a cada minuto
- **Node local** (dev) — `node --env-file=.env.local scripts/worker.mjs`

Cada worker gera um `worker_id` aleatório e persiste em `cron_runs.worker_id` / `jobs.locked_by` para diagnóstico.

## Observabilidade

- Contadores por status em `/super-admin/jobs`
- Alertas automáticos em dead-letter
- KPIs em `/super-admin/status` (fila, taxa de erro 24h)
- Logs estruturados via `logger.info/warn/error` — cada job pode chamar

## Adicionar um novo kind

1. Adicione o valor ao enum SQL (`ALTER TYPE job_kind ADD VALUE`)
2. Adicione ao `JOB_KINDS` em `src/lib/queue/types.ts`
3. Crie o processor em `src/lib/queue/processors/`
4. Registre em `src/lib/queue/processors/index.ts`
5. Enfileire via `enqueueJob({ kind: 'foo', payload })`
