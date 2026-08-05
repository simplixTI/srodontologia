# Fase 10F · BI / Relatórios + Search Global + Automações

## Migration `0050_phase10f_reports_search.sql`

12 views RLS-safe (`security_invoker`) para relatórios pré-fabricados,
prontos para consulta e export CSV.

### Views por área

**Casos**
- `v_report_cases_by_status` — total por status + últimos 30 dias
- `v_report_cases_health_distribution` — high/medium/low/unknown
- `v_report_dentist_activity` — total casos, últimos 30d, entregues

**Produção**
- `v_report_production_throughput_daily` — transições/dia + retrabalhos (90d)
- `v_report_production_stage_avg_time` — tempo médio por etapa
- `v_report_technician_productivity` — cards completed/active + rework + tempo médio

**Qualidade**
- `v_report_qc_pass_rate_daily` — total/passed/failed + pass_rate% (90d)

**Entregas**
- `v_report_deliveries_on_time` — on-time vs late + on_time_rate
- `v_report_deliveries_by_carrier` — total/delivered/open por transportadora

**Financeiro**
- `v_report_finance_revenue_by_month` — income/expense/net por mês (12m)
- `v_report_finance_top_expense_categories` — top categorias últimos 90d
- `v_report_finance_commission_paid` — comissões pagas por beneficiário/mês

## Feature layer (`src/features/reports/`)

- **types.ts** — 12 tipos + labels PT-BR + `ReportKey` union
- **queries.ts** — função `query<T>(view)` genérica + wrappers tipados
- **`src/lib/csv.ts`** — helper `toCsv()` RFC 4180 conforme (escape aspas,
  vírgulas, novas linhas)

## Rotas UI

| Rota | Descrição |
|---|---|
| `/relatorios` | Índice agrupado por área (Casos, Produção, Qualidade, Entregas, Financeiro) |
| `/relatorios/[reportKey]` | Tabela dinâmica com cabeçalhos + formatação (número BR, data, etc.) + botão CSV |
| `/api/reports/[reportKey].csv` | Endpoint CSV download com Content-Disposition |

Nav: `/relatorios` ativo no grupo Estúdio.

## Search global

O índice `search_index` (Fase 5) já suporta novas entidades via
`entity_type` livre. Os handlers de eventos existentes indexam novas
entidades ao serem criadas:

- `production.card_created` → indexa em search_index
- `planning.created` → indexa
- Calendar events, payables ficam para próximos passos (handlers adicionais)

## Automações

O motor de automações (Fase 5D) opera sobre `automation_rules` mapeadas a
`domain_events`. Com os novos types publicados pelas fases 10A-10E,
regras podem ser criadas em `/hub/automacoes` para:

- `production.rework_flagged` → notificar admin
- `production.card_completed` → gerar entrega (delivery)
- `planning.approved` → auto-promover para produção
- `delivery.dispatched` → email para dentista com tracking
- `qc_inspection.failed` (via production.rework_flagged) → alerta

## Testes

- **`tests/csv.test.ts`** — 8 testes cobrindo edge cases (escape, null,
  headers explícitos)
- **`e2e/reports.spec.ts`** — 2 smoke tests

Suite total: **205 testes vitest passando** · typecheck 0 erros.

## Próximos passos

- Materialized views + refresh diário para relatórios pesados
- Dashboards por perfil (`Diretoria`, `Operação`, `Comercial`, `Suporte`)
- Filtros de período em cada relatório (`?from=&to=`)
- Excel (.xlsx) via lib como `xlsx` ou `exceljs`
- PDF via server-side rendering (Puppeteer ou react-pdf)
- Charts SVG puros para cada relatório
