# Fase 10D · Financeiro v2

Módulo financeiro completo sobre a base 0028 (invoices operacionais):
categorias, centros de custo, contas a pagar, comissões, livro-razão
unificado, KPIs, fluxo de caixa 90d e DRE mensal simplificado.

## Migration `0048_phase10d_financial_v2.sql`

### Tabelas

| Tabela | Uso |
|---|---|
| `fin_categories` | Categorias `revenue/expense` com árvore `parent_id` e `code` |
| `fin_cost_centers` | Centros de custo (departamentos/áreas) |
| `fin_accounts_payable` | Contas a pagar (fornecedor, categoria, CC, vencimento, status) |
| `fin_commissions` | Comissões por beneficiário (profile), com base, percentual, valor |
| `fin_transactions` | Livro-razão unificado com `source_type/source_id` para rastreabilidade |

### Enums

- `fin_category_kind` — `revenue`, `expense`
- `payable_status` — `pending`, `scheduled`, `paid`, `overdue`, `cancelled`
- `commission_status` — `pending`, `approved`, `paid`, `cancelled`
- `txn_kind` — `income`, `expense`

### RPCs

- **`pay_payable(payable_id, paid_amount, method, notes)`** — marca conta
  como paga + insere `fin_transactions` (expense) atômicamente
- **`register_invoice_payment_txn(payment_id)`** — cria transaction income
  para recebimento, com idempotência via `source_type + source_id`
- **`mark_overdue_payables()`** — atualiza status para `overdue` (para cron)

### Views

- **`v_finance_kpis`** — income/expense 30d + MTD
- **`v_cash_flow_daily`** — 90 dias com net = income − expense
- **`v_dre_month`** — receitas/despesas por categoria (12 meses)
- **`v_payables_open`** — resumo de contas em aberto e vencidas

### RLS

- Escrita apenas `super_admin/admin/finance`
- Leitura: interno + comissões visíveis também para o próprio beneficiário

## Feature layer (`src/features/finance-v2/`)

- **types.ts** — todos os tipos + labels/colors
- **validations/finance-v2.ts** — 7 schemas Zod (category, costCenter, payable,
  payPayable, commission, commissionTransition, txn) + extractors FormData
- **queries.ts** — categorias, CCs, payables (com filtro), commissions, txns,
  KPIs, fluxo de caixa, DRE, resumo de payables, `listInternalProfiles`
- **service.ts** — CRUDs completos + `payPayable` (via RPC) +
  `transitionCommission` (aprovada→paga registra expense automaticamente)
- **actions.ts** — 14 server actions com `requireFinance` role gate

## Rotas UI

| Rota | Descrição |
|---|---|
| `/financeiro` | Dashboard: 4 KPIs, gráfico de fluxo de caixa 90d SVG puro, últimas transações |
| `/financeiro/pagar` | Lista de contas a pagar com filtro por status, badge automático de vencidas |
| `/financeiro/pagar/novo` | Form completo (categoria, CC, vencimento, valor) |
| `/financeiro/pagar/[id]` | Detalhe + PayPanel (registrar pagamento via RPC) |
| `/financeiro/categorias` | CRUD em 2 colunas (receitas/despesas) |
| `/financeiro/centros-custo` | CRUD |
| `/financeiro/comissoes` | Lista com workflow pending→approved→paid + cancelamento; ao pagar cria transação de despesa |
| `/financeiro/dre` | DRE mensal 12 meses agrupado por categoria, com totais e net |

Nav: `/financeiro` ativo no grupo Fluxo.

## Integrações futuras (preparadas)

- ERPs: `external_reference` em payables permite rastrear ID externo
- Conta Azul, Omie, Bling, SAP, TOTVS — endpoint `/api/v1/financial/sync`
  (não implementado, deixado como próximo passo)

## Testes

- **`tests/finance-v2-validations.test.ts`** — 17 testes de schemas + FormData
- **`e2e/finance-v2.spec.ts`** — 5 smoke tests rotas protegidas

Suite total: **177 testes vitest passando** · typecheck 0 erros.

## Próximos passos

- Contas a receber com workflow próprio (hoje reutiliza `invoices` operacionais)
- Forecast/orçado vs realizado por categoria
- Export DRE em PDF/Excel
- Integração ERPs via connectors (`src/lib/erp-connectors/`)
- Módulo de fluxo de caixa projetado (agenda futura)
