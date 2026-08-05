# Fase 10C · Quality Control + Entregas v2

Módulo QC (aprovar/reprovar cartão da produção com feedback estruturado) +
expansão do módulo de Entregas com motoristas, transportadoras, rotas,
romaneios com QR e ocorrências.

## Migration `0047_phase10c_qc_deliveries_v2.sql`

### Bloco QC — 5 tabelas + 2 RPCs + 1 view

| Tabela | Uso |
|---|---|
| `qc_checklists` | Templates por org, opcionalmente por `case_type` |
| `qc_checklist_items` | Items do template com `is_critical` |
| `qc_inspections` | Inspeção ligada a `production_card_id` + `checklist_id` |
| `qc_inspection_items` | Respostas item-a-item (`pass/fail/na/pending`) |
| `qc_photos` | Evidência fotográfica anexada a inspeção/item |

**RPC `instantiate_qc_inspection(case_id, card_id, checklist_id)`** — cria
inspeção `in_progress` e copia items do template.

**RPC `finalize_qc_inspection(inspection_id, rework_stage_id?)`** — a
função conta itens `fail`; se 0 → `passed`; se ≥1 → `failed` e chama
`advance_production_card()` **automaticamente** movendo o cartão para a
etapa de retrabalho (`is_rework = true`) da organização. Registro no
`production_events` com motivo "Reprovado no QC".

**View `v_qc_metrics`** — passed/failed/open por período.

### Bloco Entregas v2 — 6 tabelas + 1 view + 1 RPC + colunas em `deliveries`

| Tabela | Uso |
|---|---|
| `delivery_drivers` | Motoristas (opcional link a `profiles`) — placa, modelo, status |
| `delivery_carriers` | Transportadoras — com `tracking_url_template` |
| `delivery_routes` | Rotas (regiões atendidas) com motorista responsável |
| `delivery_manifests` | Romaneios (`code` auto ROM-000123 + `qr_token` opaco) |
| `delivery_manifest_items` | Join manifest ↔ delivery com posição |
| `delivery_incidents` | Ocorrências (severity + kind: delay/damage/lost/wrong_address/return/other) |

**Colunas novas em `deliveries`**: `driver_id`, `carrier_id`, `route_id`,
`manifest_id`, `qr_token`, `barcode`, `origin_address`, `destination_address`, `dispatched_at`.

**RPC `next_manifest_code(org_id)`** — gerador sequencial idempotente.

**View `v_delivery_kpis`** — delivered_7d/30d, open_total, dispatched, in_transit.

## Feature layers

### `src/features/qc/`
- `types.ts` — QcChecklist, QcChecklistItem, QcInspection, QcInspectionItem, QcMetrics
- `queries.ts` — listChecklists/getChecklist/listChecklistItems, listInspections, getInspection, listInspectionItems, getMetrics
- `service.ts` — CRUD template + createInspection (RPC) + updateInspectionItem + finalizeInspection (RPC) + cancelInspection
- `actions.ts` — 8 server actions com role gate `super_admin/admin/technical_planning/production`

### `src/features/deliveries-v2/`
- `types.ts` — Driver/Carrier/Route/Manifest/ManifestItem/DeliveryIncident/DeliveryKpis
- `queries.ts` — listDrivers, listCarriers, listRoutes, listManifests (com meta), getManifest, listManifestDeliveries, listOpenIncidents, getKpis, listPendingDeliveriesForManifest
- `service.ts` — CRUDs + createManifest (RPC next_manifest_code + qr_token via crypto.randomBytes) + transitionManifest + add/remove delivery + createIncident + resolveIncident
- `actions.ts` — 16 server actions com role gate `super_admin/admin/logistics`

## Rotas UI

### QC
| Rota | Descrição |
|---|---|
| `/qualidade` | Dashboard com KPIs + lista de inspeções filtrável por status |
| `/qualidade/[inspectionId]` | Formulário completo: KPIs, radio pass/fail/na por item + motivo, notas, botões Aprovar / Reprovar+Retrabalho |
| `/qualidade/templates` | CRUD de templates |

### Entregas v2
| Rota | Descrição |
|---|---|
| `/entregas/romaneios` | Lista de romaneios com KPI |
| `/entregas/romaneios/[manifestId]` | Detalhe: adicionar/remover deliveries, workflow ready→dispatched→in_transit→completed, painel QR + tracking URL |
| `/entregas/motoristas` | Lista + CRUD |
| `/entregas/rotas` | CRUD com atribuição a motorista |

Nav: `/qualidade` e `/entregas/romaneios` no grupo Fluxo.

## Integração 10A ↔ 10C

Quando uma inspeção QC é **reprovada** (`finalize_qc_inspection`):
1. Status vira `failed`
2. Sistema busca a stage `is_rework = true` da org
3. Chama `advance_production_card` movendo o cartão para retrabalho
4. Publica `production.rework_flagged`
5. Kanban da Produção reflete automaticamente

Quando **aprovada**: publica `production.stage_changed`; o time da produção
pode manualmente mover o cartão para a próxima etapa.

## Testes

- **`tests/qc-deliveries-validations.test.ts`** — 32 testes (QC checklists,
  items, inspection lifecycle, driver, carrier, route, manifest transitions,
  incidents)
- **`e2e/qc-deliveries.spec.ts`** — smoke para 5 rotas protegidas

Suite total: **160 testes vitest passando** · typecheck 0 erros.

## Próximos passos (fora 10C)

- Upload de foto na inspeção (usar bucket case-files existente)
- Página pública `/rastreio/[qr_token]` (server-side, sem auth) para dentista
- Assinatura eletrônica no comprovante de entrega
- Notificação automática para dentista quando `manifest.status = dispatched`
- Integração Google Maps API para roteirização de rotas
- App mobile para motorista com scan de QR/barcode
