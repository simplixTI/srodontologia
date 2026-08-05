# Fase 10B · Planejamento v2

Expande o módulo Planejamento sobre a fundação da 0027 com **templates**,
**checklist por versão**, **thread de comentários** (interno vs visível ao
dentista), **assinatura eletrônica** e **promoção direta para Produção** —
que integra automaticamente com o Kanban da Fase 10A.

## Migration `0046_phase10b_planning_v2.sql`

### `planning_versions` (colunas adicionadas)

| Coluna | Tipo | Uso |
|---|---|---|
| `dentist_signed_at` / `dentist_signed_ip` / `dentist_signed_ua` | timestamptz/text | Assinatura eletrônica pelo dentista via portal |
| `internal_signed_at` / `internal_signed_by` | timestamptz/uuid | Assinatura pelo responsável interno |
| `checklist_completed_at` | timestamptz | Timestamp quando todos os itens foram concluídos |
| `sent_at` | timestamptz | Envio ao dentista |
| `promoted_to_production_at` | timestamptz | Promoção para Produção |
| `production_card_id` | uuid FK → `production_cards` | Cartão MES criado |
| `template_id` | uuid FK → `planning_templates` | Template usado |
| `estimated_delivery_at` | timestamptz | Data estimada para entrega |

### Novas tabelas

| Tabela | Propósito |
|---|---|
| `planning_templates` | Templates reutilizáveis por org (opcionalmente por `case_type`), com `is_default` |
| `planning_template_items` | Items do checklist do template com `position`, `is_required` |
| `planning_checklist_items` | Checklist por versão (instanciado do template ou ad-hoc), com `is_done`, `done_by`, `done_at`, `notes` |
| `planning_comments` | Thread por versão com `is_internal` (true = só time interno; false = visível ao dentista via portal) |

### RPCs

- **`instantiate_planning_checklist(version_id, template_id)`** — copia items
  do template para a versão, retorna quantos foram criados; atualiza `template_id`
- **`promote_planning_to_production(version_id)`** — cria cartão de produção
  ligado ao caso (ou reutiliza existente), grava audit em `planning_actions`,
  atualiza `promoted_to_production_at` e `production_card_id` na versão.
  Falha se: versão não está `approved` ou org não tem etapa inicial configurada

### View

- **`v_planning_activity`** — por versão: `comment_count`, `checklist_total`,
  `checklist_done`, `promoted_to_production_at`

### RLS

- `planning_templates` + `planning_template_items` — leitura pela org,
  escrita por `super_admin/admin/technical_planning`
- `planning_checklist_items` — leitura interna; escrita interna + `production`
- `planning_comments` — policy separada:
  - **Interno**: leitura/escrita para `is_internal_user()` da mesma org
  - **Dentista**: leitura/escrita apenas de comentários **não-internos** e
    apenas se for o dentista responsável pelo caso (join em `dentists.profile_id`)

## Feature layer

- **types.ts** — `PlanningVersion`, `PlanningVersionWithCase`, `PlanningTemplate`,
  `PlanningTemplateItem`, `PlanningChecklistItem`, `PlanningComment`, `PlanningActivity`
- **validations/planning.ts** — 8 schemas Zod
- **queries.ts** — `listCasePlanning`, `getVersion`, `listVersionsWithCase`,
  `listTemplates`, `getTemplate`, `listTemplateItems`, `listChecklistItems`,
  `listComments`, `getVersionActivity`
- **service.ts** — CRUD completo + `promoteToProduction`
- **actions.ts** — 15 server actions (versões, templates, checklist, comentários,
  promoção); shim retrocompatível `createPlanningVersionAction` para o
  `WorkflowsTabs.tsx` da Fase 2B

## Rotas UI

| Rota | Descrição |
|---|---|
| `/planejamento` | Lista de versões (filtros por status) — visão consolidada |
| `/planejamento/[versionId]` | Detalhe: KPIs, ações, descrição, checklist, comentários |
| `/planejamento/templates` | Lista de templates |
| `/planejamento/templates/novo` | Criar template |
| `/planejamento/templates/[templateId]` | Editar template + gerenciar items |

Nav em `nav-groups.ts` grupo **Fluxo**: `/planejamento` ativo.

## Fluxo típico

```
draft ─► sent ─► approved ─► promoted_to_production
            ↓
       changes_requested ─► draft (nova versão)
```

## Integração com Produção (10A)

`promoteToProductionAction` (após aprovação):
1. Chama RPC `promote_planning_to_production`
2. RPC cria (ou reutiliza) `production_cards` na etapa inicial da org
3. Marca `promoted_to_production_at` e `production_card_id` na versão
4. Registra `planning_actions` (`promoted_to_production`)
5. Publica domain event `production.card_created` com `via: 'planning_promotion'`
6. Revalida `/producao` e `/planejamento`

O botão **Enviar para produção** só é habilitado se:
- Status = `approved`
- Cartão ainda não foi promovido (`promoted_to_production_at is null`)

Se há itens obrigatórios do checklist pendentes, o botão exibe um aviso mas
não bloqueia (decisão consciente do usuário).

## Testes

- **`tests/planning-validations.test.ts`** — 21 testes: version/transition/template/
  templateItem/checklist/comment schemas + FormData extractors
- **`e2e/planning.spec.ts`** — smoke: rotas protegidas para anônimo

Suite completa: **128 testes vitest passando** · typecheck 0 erros.

## Próximos passos (fora de 10B)

- Assinatura eletrônica real do dentista (portal) — coleta IP/UA/timestamp
- STL viewer com three.js para arquivos 3D anexados
- Comparação side-by-side entre duas versões (view de diff)
- Auto-marcação de `checklist_completed_at` via trigger quando todos itens
  obrigatórios ficam `is_done = true`
- Rich text no comentário (Markdown) + menções (@equipe)
- Notificação automática ao dentista quando versão vai para `sent`
