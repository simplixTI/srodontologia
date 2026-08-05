# Fase 10A · Produção/MES + Técnicos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans task-by-task. Steps use `- [ ]` for tracking.

**Goal:** Entregar módulo Produção (MES com Kanban configurável por org) + Módulo Técnicos com fila e métricas, integrados ao Event Bus, Jobs, Audit, RLS e Feature Flags existentes.

**Architecture:**
- Novas tabelas em migration `0045_phase10a_production_mes.sql` (org-scoped, RLS strict)
- Etapas configuráveis por org (`production_stages`), cartão por caso (`production_cards`), histórico de transições (`production_events`), técnicos como extensão de `profiles` (`technicians`), skills (`technician_skills`)
- Domain events novos: `production.card_created`, `production.stage_changed`, `production.card_completed`, `production.rework_flagged`
- Kanban SSR + optimistic drag (padrão `LeadsKanban.tsx`), server actions para transições e time-tracking
- Feature flag `production.mes` (cascata plano/tenant/user)

**Tech Stack:** Next.js 14 App Router, Supabase (RLS), TypeScript strict, Zod, Sonner, Recharts, vitest.

---

## File Structure

**Migrations**
- `supabase/migrations/0045_phase10a_production_mes.sql` — todas as tabelas + RLS + defaults + funções auxiliares

**Types + validations**
- `src/lib/validations/production.ts` — schemas Zod
- `src/features/production/types.ts` — TS types compartilhados
- `src/features/technicians/types.ts`

**Services (server-only)**
- `src/features/production/service.ts` — CRUD stages/cards, transições, métricas
- `src/features/production/queries.ts` — SELECT SSR
- `src/features/production/actions.ts` — server actions
- `src/features/technicians/service.ts`
- `src/features/technicians/queries.ts`
- `src/features/technicians/actions.ts`

**UI**
- `src/app/(hub)/producao/page.tsx` — Kanban SSR
- `src/app/(hub)/producao/ProductionKanban.tsx` — client component
- `src/app/(hub)/producao/[cardId]/page.tsx` — detalhe do cartão
- `src/app/(hub)/producao/configurar/page.tsx` — config de etapas
- `src/app/(hub)/producao/loading.tsx`
- `src/app/(hub)/tecnicos/page.tsx`
- `src/app/(hub)/tecnicos/[id]/page.tsx`
- `src/app/(hub)/tecnicos/novo/page.tsx`

**Integrations**
- `src/lib/events/types.ts` — adicionar 4 event types
- `src/components/hub/nav-groups.ts` — remover `disabled: true` de `/producao` + adicionar `/tecnicos`
- `src/lib/features/resolver.ts` — checar se resolver já suporta a flag `production.mes` (senão só usar no code)

**Tests**
- `tests/production/service.test.ts`
- `tests/production/rls.test.ts` — RLS multi-tenant
- `tests/technicians/service.test.ts`
- `e2e/production.spec.ts` — smoke Kanban

**Docs**
- `docs/phase-10a-production-mes.md`
- `docs/progress.md` — appendar seção Fase 10A

---

## Task 1: Migration 0045 (schema MES + técnicos)

**File:** `supabase/migrations/0045_phase10a_production_mes.sql`

Tabelas:
- `production_stages` (org-scoped, ordem, cor, sla_hours, is_terminal, is_rework)
- `production_cards` (case_id, current_stage_id, priority, assignee_id, entered_stage_at, sla_due_at)
- `production_events` (card_id, from_stage_id, to_stage_id, actor_id, duration_ms, is_rework, reason, notes)
- `technicians` (profile_id UNIQUE, specialty, weekly_hours, status, team, hourly_cost)
- `technician_skills` (technician_id, skill, level)
- `technician_availability` (technician_id, weekday, start_time, end_time)
- View `v_production_metrics` — agregados por stage e por técnico
- View `v_technician_workload` — fila atual por técnico
- RPC `advance_production_card(card_id, to_stage_id, reason, is_rework)` — transição atômica

RLS: todas org-scoped via `current_user_organization_id()`. Write só `super_admin/admin/technician_manager`.

Seed default de 8 stages por organização (idempotente).

- [ ] **Step 1**: Escrever migration completa
- [ ] **Step 2**: Aplicar via `npx supabase db reset --local` OU documentar rodar manualmente (dev sem supabase local)
- [ ] **Step 3**: Commit `feat(fase10a): migration 0045 MES + technicians`

## Task 2: Types + Zod schemas

**Files:**
- `src/lib/validations/production.ts`
- `src/features/production/types.ts`
- `src/features/technicians/types.ts`

Definir: `ProductionStage`, `ProductionCard`, `ProductionEvent`, `AdvanceCardInput`, `Technician`, `TechnicianSkill`, `TechnicianStatus`, etc.

- [ ] **Step 1**: Escrever types.ts para production
- [ ] **Step 2**: Escrever types.ts para technicians
- [ ] **Step 3**: Escrever validations/production.ts (Zod)
- [ ] **Step 4**: Commit

## Task 3: Production queries + service

**Files:**
- `src/features/production/queries.ts` — listStages, listCards, getCard, listEventsByCard
- `src/features/production/service.ts` — createStage, updateStage, deleteStage (se vazia), advanceCard (chama RPC), reworkCard, assignCard, updatePriority

Server-only. Usa admin client onde necessário e client SSR para tenant-scoped reads.

- [ ] **Step 1**: queries.ts
- [ ] **Step 2**: service.ts
- [ ] **Step 3**: Testes unit em `tests/production/service.test.ts` (mock supabase client)
- [ ] **Step 4**: Commit

## Task 4: Production server actions + event bus

**Files:**
- `src/features/production/actions.ts`
- `src/lib/events/types.ts` (add types)

Actions: `advanceCardAction`, `assignCardAction`, `flagReworkAction`, `updatePriorityAction`, `createStageAction`, `updateStageAction`, `reorderStagesAction`. Todas emitem domain event.

- [ ] **Step 1**: Adicionar event types em events/types.ts
- [ ] **Step 2**: Escrever actions.ts com revalidatePath + emit
- [ ] **Step 3**: Commit

## Task 5: UI Kanban Produção

**Files:**
- `src/app/(hub)/producao/page.tsx` — SSR, carrega stages + cards
- `src/app/(hub)/producao/ProductionKanban.tsx` — client drag/drop
- `src/app/(hub)/producao/loading.tsx`

Layout: colunas por stage, cards com priority badge, SLA countdown, assignee avatar. Drag entre colunas dispara `advanceCardAction`. Filtros por prioridade, assignee, atraso.

- [ ] **Step 1**: loading.tsx
- [ ] **Step 2**: page.tsx SSR
- [ ] **Step 3**: ProductionKanban.tsx client
- [ ] **Step 4**: Commit

## Task 6: Card detail page

**File:** `src/app/(hub)/producao/[cardId]/page.tsx`

Mostra: dados do caso, stage atual, tempo na stage, histórico de eventos (linha do tempo), ações (avançar, retrabalho, atribuir, prioridade).

- [ ] **Step 1**: page + componentes
- [ ] **Step 2**: Commit

## Task 7: Config de etapas

**File:** `src/app/(hub)/producao/configurar/page.tsx`

CRUD de stages: nome, cor, sla_hours, ordem (drag reorder), terminal/rework. Só admin.

- [ ] **Step 1**: page + form
- [ ] **Step 2**: Commit

## Task 8: Técnicos — queries, service, actions

**Files:**
- `src/features/technicians/queries.ts` — listTechnicians, getTechnician, listWorkload
- `src/features/technicians/service.ts` — createTechnician (upgrade profile), updateStatus, addSkill
- `src/features/technicians/actions.ts`

- [ ] **Step 1**: queries + service
- [ ] **Step 2**: actions
- [ ] **Step 3**: Testes
- [ ] **Step 4**: Commit

## Task 9: UI Técnicos

**Files:**
- `src/app/(hub)/tecnicos/page.tsx` — lista com KPIs (fila, tempo médio, retrabalho, eficiência, ranking)
- `src/app/(hub)/tecnicos/[id]/page.tsx` — detalhe + fila atual
- `src/app/(hub)/tecnicos/novo/page.tsx` — associar profile existente como técnico

- [ ] **Step 1**: novo/page
- [ ] **Step 2**: page principal
- [ ] **Step 3**: [id]/page
- [ ] **Step 4**: Commit

## Task 10: Nav + feature flag + integration final

- Atualizar `nav-groups.ts` (remover disabled, adicionar `/tecnicos`)
- Feature flag `production.mes` (default true, gate no page.tsx)
- Registrar event handlers se aplicável (nada crítico agora, jobs futuros)

- [ ] Steps + Commit

## Task 11: E2E smoke

**File:** `e2e/production.spec.ts`

Login admin → navega para `/producao` → vê colunas → drag ainda opcional (checa render).

- [ ] Escrever spec
- [ ] Commit

## Task 12: Docs + progress

**Files:**
- `docs/phase-10a-production-mes.md` — schema, fluxo, RLS, eventos, API interna, próximos passos
- `docs/progress.md` — appendar seção Fase 10A

- [ ] Escrever docs
- [ ] Atualizar progress
- [ ] Commit final `feat(fase10a): produção/MES + técnicos completo`

---

## Notes

- Não altero migrations existentes (0001-0044).
- Reuso: `case_id` FK para `cases`, `assignee_id` FK para `profiles`, `audit_logs` via trigger existente, event bus para produção, `check_feature_flag()` para gating, storage buckets já existentes.
- Fase 10B (planejamento v2), 10C (QC + entregas v2), 10D (financeiro v2), 10E (agenda + DAM), 10F (BI + search + automations) ficam para sub-fases seguintes conforme discutido.
