# Fase 10A · Produção (MES) + Técnicos

Módulo operacional do chão do laboratório: Kanban configurável por organização,
cartão por caso com histórico de transições, retrabalho, SLA por etapa,
técnicos com fila e métricas. Emite domain events; integra com Event Bus,
Jobs, Auditoria e Notificações.

## Escopo

- **Kanban de produção** por etapa configurável, com drag-and-drop otimista
- **Cartão por caso** (1:1) — cria-se ao mover o caso para produção
- **Transições auditadas** — cada mudança de etapa registra tempo, ator, motivo
- **Retrabalho** — coluna dedicada + contador `rework_count` por cartão
- **SLA por etapa** — `sla_due_at` recalculado a cada transição
- **Prioridade** — `low | normal | high | urgent`
- **Atribuição** — `assignee_id` (profile), com métrica de fila por técnico
- **Técnicos** — extensão de `profiles` com especialidade, time, custo/hora,
  skills e disponibilidade

## Migration `0045_phase10a_production_mes.sql`

### Tabelas

| Tabela | Propósito |
|---|---|
| `production_stages` | Etapas configuráveis por org (`slug`, `color`, `position`, `sla_hours`, `is_terminal`, `is_rework`, `is_initial`) |
| `production_cards` | Um cartão por caso (`case_id` UNIQUE), stage atual, prioridade, `entered_stage_at`, `sla_due_at`, `total_time_ms`, `rework_count` |
| `production_events` | Histórico imutável de transições (`from_stage_id`, `to_stage_id`, `duration_ms`, `is_rework`, `reason`, `notes`) |
| `technicians` | Profile promovido a técnico (`profile_id` UNIQUE por org, `specialty`, `team`, `status`, `weekly_hours`, `hourly_cost`) |
| `technician_skills` | Skills nomeados com nível (`beginner..expert`) |
| `technician_availability` | Disponibilidade semanal para roteirização futura |

### Enums

- `production_card_priority` — `low`, `normal`, `high`, `urgent`
- `technician_status` — `active`, `inactive`, `vacation`, `on_leave`
- `skill_level` — `beginner`, `intermediate`, `advanced`, `expert`

### RPC

```sql
public.advance_production_card(
  p_card_id     uuid,
  p_to_stage_id uuid,
  p_reason      text default null,
  p_notes       text default null,
  p_is_rework   boolean default false
) returns production_cards
```

Transição atômica que:
1. Bloqueia o cartão (`FOR UPDATE`)
2. Valida que a stage destino é da mesma org e está ativa
3. Calcula `duration_ms` na from_stage
4. Insere `production_events` imutável
5. Atualiza card (`current_stage_id`, `entered_stage_at`, `sla_due_at`, `completed_at` se terminal, `rework_count`, `total_time_ms`)

### Views

- **`v_production_metrics`** — por stage: `active_cards`, `overdue_cards`, `avg_time_in_stage_seconds`
- **`v_technician_workload`** — por técnico: `active_cards`, `overdue_cards`, `urgent_cards`, `total_rework`

### RLS

Todas as tabelas: `enable RLS` + `force RLS`, org-scoped via
`current_user_organization_id()`. Escrita:

- `production_stages` → `super_admin`, `admin`, `technical_planning`
- `production_cards` → + `production`, `logistics`
- `production_events` → INSERT-only (imutável); mesmos roles do card
- `technicians` / `technician_skills` / `technician_availability` → `super_admin`, `admin`, `technical_planning`

### Seed

`seed_default_production_stages(org_id)` semeia 9 etapas por org
(Recebido → Modelagem → Impressão → Fundição/Usinagem → Acabamento →
Polimento → Controle Qualidade → Retrabalho → Pronto). Idempotente
via `on conflict (organization_id, slug)`.

Também executa para todas as orgs existentes ao aplicar a migration.

## Domain Events

Publicados via `publishEvent()` em `src/lib/events`:

- `production.card_created` — cartão criado para um caso
- `production.stage_changed` — transição normal
- `production.rework_flagged` — transição marcada como retrabalho
- `production.card_completed` — chegou em stage terminal
- `production.card_assigned` — mudança de responsável

## Server actions

`src/features/production/actions.ts`:

- `createStageAction(state, FormData)` — Zod + role gate
- `updateStageAction(id, patch)`
- `deleteStageAction(id)` — bloqueia se houver cartões ativos
- `reorderStagesAction(ids)`
- `createCardForCaseAction(caseId)` — usa stage inicial da org
- `advanceCardAction({ card_id, to_stage_id, reason?, notes?, is_rework? })`
- `assignCardAction({ card_id, assignee_id })`
- `updatePriorityAction({ card_id, priority })`

`src/features/technicians/actions.ts`:

- `createTechnicianAction(state, FormData)`
- `updateTechnicianAction(id, patch)`
- `updateStatusAction(id, status)`
- `addSkillAction(technicianId, skill, level)`
- `removeSkillAction(skillId, technicianId)`
- `deleteTechnicianAction(id)`

## Rotas UI

| Rota | Descrição |
|---|---|
| `/producao` | Kanban SSR + drag/drop otimista + filtros (prioridade, sem assignee, atrasados) |
| `/producao/[cardId]` | Detalhe do cartão, KPIs, ações, histórico linha do tempo |
| `/producao/configurar` | CRUD de etapas (nome, slug, cor, SLA, flags), reorder, toggle ativa |
| `/tecnicos` | Lista de técnicos com KPIs (fila, atrasados, urgentes, retrabalho) |
| `/tecnicos/novo` | Promoção de profile existente a técnico |
| `/tecnicos/[id]` | Detalhe, fila atual, painel de skills, dados operacionais |

Navegação em `src/components/hub/nav-groups.ts` grupo **Fluxo**.

## Testes

- **`tests/production-validations.test.ts`** — 25 testes cobrem stageSchema,
  advanceCardSchema, updatePrioritySchema, technicianSchema, skillSchema,
  extractStageForm, extractTechnicianForm
- **`e2e/production.spec.ts`** — smoke: rotas protegidas redirecionam anônimo
  para `/login`

Total: **107 testes passando** (todo o vitest suite).

## Próximos passos (fora do escopo 10A)

- Job `production_sla_check` — cron periódico para gerar `operational_alerts`
  em cartões com `sla_due_at < now()`
- Automation rule template: "cartão atrasado → notificar admin"
- Ganttchart/timeline por caso
- Integração com módulo Planejamento (Fase 10B) para criar cartão
  automaticamente ao aprovar planejamento

## Como testar localmente

1. Aplicar migration em Supabase Studio ou CLI:
   ```
   psql < supabase/migrations/0045_phase10a_production_mes.sql
   ```
2. Verificar seed de stages:
   ```sql
   select name, position, slug from production_stages
   where organization_id = '<org-id>' order by position;
   ```
3. Criar um cartão de teste chamando `advance_production_card` via SQL
   ou via server action `createCardForCaseAction(caseId)`
4. Acessar `/producao` no HUB
