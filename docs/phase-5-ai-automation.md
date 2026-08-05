# Fase 5 · IA, Automação e Diferenciais Competitivos

Fase de **transformação em plataforma inteligente**. Não cria novos módulos administrativos — adiciona camadas que reduzem trabalho manual, aumentam produtividade e melhoram a experiência do dentista, reutilizando toda a arquitetura das Fases 1-4.

## Princípios

1. **Providers atrás de interface** — IA, OCR, CPF, WhatsApp e Email têm cada um uma abstração `interface + adapters`. Zero acoplamento a fornecedor. Mock provider sempre disponível.
2. **Nada bloqueia UI** — OCR, IA, PDF, notificações batch e webhooks vão para a fila `jobs`. Server actions só enfileiram.
3. **Event Bus interno + persistente** — toda mudança relevante emite um `domain_event`. Handlers desacoplados (automation, search index, webhooks) processam.
4. **Configuração por organização** — `ai_settings`, `integration_settings`, `automation_rules`, `webhooks`, `api_keys` são todas multi-tenant com RLS strict.
5. **Segurança em camadas mantida** — RLS + rate-limit + Zod + sanitização de prompts + tokens hasheados.

## Migration 0038

Cria a base de dados de Fase 5:

| Tabela | Propósito |
|--------|-----------|
| `jobs` + enums `job_kind`, `job_status` | Fila assíncrona com atomic `dequeue_next_job` (FOR UPDATE SKIP LOCKED) |
| `domain_events` | Log persistente do event bus com index de processados |
| `ai_settings` | Provider + modelo + temperatura + budget + feature flags |
| `integration_settings` | Provider por kind (email, whatsapp, cpf, ocr, webhook) + secret_ref |
| `automation_rules` | Regras condicionais orientadas a eventos |
| `webhooks` + `webhook_deliveries` | Endpoints externos assinados HMAC-SHA256 |
| `search_index` (tsvector pt-BR) | Full-text + tokens GIN |
| `case_ai_summaries` | Cache de resumo IA por caso |
| `ai_usage_log` | Tokens + custo + latência para billing |
| `cpf_lookup_cache` | Cache 30d com sha256(cpf) — nunca CPF em claro |
| `ocr_extractions` | Extrações aguardando revisão humana |
| `pdf_documents` | Índice de PDFs gerados + bucket `pdf-documents` |
| `api_keys` + `api_request_log` | API pública v1 com HMAC token hasheado |

**RPCs SECURITY DEFINER:**
- `emit_domain_event(org, type, aggregate_type, aggregate_id, payload)` — helper para triggers/actions
- `enqueue_job(kind, payload, case_id?, run_after?, priority?, max_attempts?)` — enfileiramento de dentro do banco
- `dequeue_next_job(worker_id, kinds[]?)` — claim atômico (worker)

## Camadas novas em `src/lib`

### `src/lib/ai/` — Provider de IA
- `types.ts` — `AiMessage`, `AiCompletionRequest/Response`, `AiProvider`
- `providers/mock.ts` — deterministic offline
- `providers/openai.ts` — OpenAI/OpenRouter (fetch, sem SDK)
- `providers/anthropic.ts` — Anthropic Messages API
- `providers/google.ts` — Gemini v1beta
- `registry.ts` — `resolveAiProvider(orgId)` — resolve provider + config + feature flags
- `usage.ts` — `logAiUsage()`, `getMonthlyAiUsage()`
- `prompt-safety.ts` — `sanitizeUserText`, `buildSystemPrompt` (defesa contra prompt injection)
- `index.ts` — `runAi()` (entrypoint público)

### `src/lib/events/`
- `types.ts` — catálogo de eventos + tipos
- `bus.ts` — `emitEvent()` + `registerEventHandler(match, fn)` + `markEventProcessed()`
- `handlers/automation.ts` — dispara `runAutomationRules(event)`
- `handlers/search-index.ts` — enfileira reindex quando `case`/`message` mudam
- `handlers/webhook.ts` — enfileira entregas para webhooks inscritos
- `index.ts` — bootstrap único por processo + `publishEvent()`

### `src/lib/queue/`
- `types.ts` — `JobKind`, `JobStatus`, `Job`, `JobProcessor`
- `enqueue.ts` — `enqueueJob(opts)` via SERVICE ROLE (chamado após guards)
- `registry.ts` — `registerJobProcessor(kind, fn)`, `getJobProcessor(kind)`
- `worker.ts` — `processNextJob()`, `runWorkerLoop()` com backoff exponencial (5s→20s→60s→180s→600s)
- `processors/*` — implementações de cada kind:
  - `webhook.ts` — POST + HMAC + retry até 5 tentativas
  - `search.ts` — snapshot + upsert
  - `automation.ts` — carrega evento + executa `executeAutomationAction`
  - `email.ts` / `whatsapp.ts` — delegam ao provider externo
  - `ocr.ts` — download + provider + upsert em `ocr_extractions`
  - `ai-*.ts` — resumo, prazo, assistente, imagem
  - `pdf.ts` — usa `generateDocumentPdf`

### `src/lib/automation/`
- `conditions.ts` — evaluator para `[{field, op, value}]` (eq/gt/gte/in/contains/exists)
- `actions.ts` — catálogo executável: `notify_admins`, `notify_case_owner`, `send_email`, `send_whatsapp`, `enqueue_webhook`, `update_case_status`, `enqueue_pdf`, `enqueue_summary`, `log_only`
- `runner.ts` — carrega regras por evento + avalia + enfileira `automation_run`

### `src/lib/integrations/`
- `config.ts` — `loadIntegration(org, kind)` + `readIntegrationSecret()` (lê env por `secret_ref`)
- `email/provider.ts` — Resend + SendGrid
- `whatsapp/provider.ts` — Z-API + Twilio + Meta Cloud
- `cpf/provider.ts` — validação de CPF (checksum) + cache 30d (sha256) + provider externo

### `src/lib/ocr/`
- `types.ts` — `OcrProvider`, `OcrRunInput`, `OcrRunResult`
- `providers/mock.ts` — offline
- `runner.ts` — download do storage + provider

### `src/lib/prazo/`
- `predictor.ts` — média + desvio-padrão das últimas 20 entregas do mesmo `case_type` (fallback: `default_lead_time_days` → 10 dias)
- `overdue-detector.ts` — scan periódico + `case.overdue` (dedup 24h)

### `src/lib/pdf/`
- `text-pdf.ts` — encoder PDF nativo (sem dep)
- `renderers/*.ts` — quote, planning, receipt, case-report
- `generator.ts` — orquestra render + upload + index

### `src/lib/search/index-writer.ts`
- `enqueueSearchReindex(org, type, id)` — enfileira reindex

### `src/lib/webhooks/dispatcher.ts`
- `enqueueWebhookDeliveries(event)` — cria `webhook_deliveries` + enfileira

### `src/lib/api/`
- `auth.ts` — `authenticateApiRequest(req, {requiredScope})` — Bearer sha256 hasheado
- `rate-limit.ts` — 120/min por api key

## UI adicionada

### HUB (/hub)
- `/assistente` — chat com o assistente de IA do laboratório
- `/ocr` — fila de OCR + revisão + confirmação/rejeição
- `/busca` — busca inteligente (websearch_to_tsquery)
- `/automacoes` — CRUD de regras
- `/integracoes` — provider de IA + integrações externas
- `/integracoes/api` — chaves de API pública (tokens só exibidos uma vez)
- `/observabilidade` — filas + eventos + IA

Dashboard ganhou `DashboardInsightsCard` no topo (métricas em tempo real).

### Portal (/portal)
- `/portal/assistente` — assistente do dentista (dúvidas sobre uso do portal)

Sidebar do HUB ganhou grupo **Inteligência** (assistente, OCR, busca, automações) e **observabilidade** no grupo Sistema. Portal ganhou item **Assistente**.

## Eventos

Catálogo em `src/lib/events/types.ts`:

```
case.created | case.updated | case.status_changed | case.submitted | case.completed | case.overdue
quote.created | quote.sent | quote.approved | quote.changes_requested | quote.rejected
planning.created | planning.sent | planning.approved | planning.changes_requested
message.created | file.uploaded
delivery.dispatched | delivery.delivered | delivery.confirmed_by_dentist
notification.created | ocr.completed | ai.summary_generated
```

Para emitir um evento de dentro de um server action:

```ts
import { publishEvent } from '@/lib/events';

await publishEvent({
  organizationId: profile.organization_id,
  type: 'quote.approved',
  aggregateType: 'quote',
  aggregateId: quoteId,
  payload: { total, case_id }
});
```

O bus persiste em `domain_events`, roda os handlers registrados (automation, search, webhook) e retorna. Emissores **não devem** aguardar processamento pesado.

## API pública v1

Base: `/api/v1/*` · Auth: `Authorization: Bearer sk_live_...`

- `GET /api/v1/cases` — lista (scope `cases:read`)
- `GET /api/v1/cases/{id}` — detalhe
- `GET /api/v1/openapi` — spec OpenAPI 3.1

Middleware faz carve-out de `/api/v1/*` e `/api/cron` para pular auth por cookie.

## Worker

Duas formas:

1. **HTTP cron** (produção — Vercel Cron):
   - `GET /api/cron` com `Authorization: Bearer $CRON_SECRET`
   - Drena até 25 jobs por chamada (max 40s), depois roda `scanForOverdueCases()`
   - Configurar cron a cada minuto

2. **Node local** (dev):
   - `node --env-file=.env.local scripts/worker.mjs`

## Segurança — checklist

- [x] RLS strict em todas as novas tabelas (jobs, events, ai_*, integrations, automation, webhooks, api_keys)
- [x] Tokens de API armazenados como sha256 (raw só exibido uma vez)
- [x] CPF armazenado apenas como sha256 no cache
- [x] Secrets de integração ficam em ENV — banco guarda só `secret_ref`
- [x] Prompt injection defense (`sanitizeUserText` + `buildSystemPrompt`)
- [x] Rate-limit por caller em: cpf, ocr, search, assistants, api
- [x] Webhook: HMAC-SHA256 no header `X-SR-Signature`
- [x] Bucket `pdf-documents` com RLS por org (dentist só lê PDFs de seus casos)

## Environment variables

Todas opcionais — sistema roda em modo mock sem elas.

```
# IA (por provider)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
OPENROUTER_API_KEY=

# Integrações (nome do env é livre — refere-se via secret_ref no admin)
EMAIL_API_KEY=
WHATSAPP_TOKEN=
CPF_API_KEY=
OCR_API_KEY=

# Worker
CRON_SECRET=<random>
```

## Testabilidade

- Providers têm sempre a variante `Mock` — permite testes end-to-end sem chaves.
- Job queue é 100% Postgres — fácil de rodar teste de integração.
- Automation runner é pura (evento → regras → ações), unit-testável.
- Prompt safety é testável isoladamente (`sanitizeUserText`).

## Roadmap pós-Fase 5

- Multimodal image analysis (real): integrar GPT-4o / Claude Sonnet / Gemini vision quando `image_analysis=true`.
- Vetor de embeddings (pgvector) para busca semântica além de tsvector.
- SDK oficial (`@sr/api-client-js`, `@sr/api-client-py`).
- Rate-limit distribuído (Upstash/Redis) para escala real.
