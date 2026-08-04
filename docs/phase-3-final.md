# SR HUB · Fase 3 — Entrega final (Módulo Operacional)

Entregue em **5 tranches** consecutivas. Todo o núcleo operacional do laboratório digital agora funciona ponta a ponta: da criação do caso à entrega, com auditoria automática e notificações internas.

## Escopo total realizado

### Tranche A · UX Foundations premium
- `Sonner` toaster global no root layout (dark + borda dourada)
- `<Dialog>` primitivo Radix + `<ConfirmProvider>` + `useConfirm()` hook (substitui `confirm()` nativo)
- `<Skeleton>`, `<SkeletonCard>`, `<SkeletonGrid>` + `loading.tsx` em `/casos`, `/leads`, `/dentistas`, `/clinicas`, `/checklists`
- `<Breadcrumbs>` component (aplicado em `/casos/[id]`)
- `not-found.tsx` global luxo (404 com tipografia display + logo)
- Migração de 8 arquivos com `alert()`/`confirm()` nativos → toast / useConfirm elegantes

### Tranche B · Módulos enriquecidos
- **Migration 0034** — `deliveries.driver_name` + `deliveries.receipt_file_id`
- **SLA engine** — `features/cases/sla.ts`: `calcSla()` puro (delivered_ok/late, overdue, due_today, at_risk, on_track) + `slaBadgeClass()` pill Tailwind. Aplicado em `/casos` list + `/casos/[id]` header
- **Orçamentos ricos** — `/casos/[id]` aba Orçamento reescrita: tabela de itens inline + formulário adicionar/deletar item com recálculo automático (server) + botões condicionais por status (marcar enviado / aprovar internamente / recusar / duplicar como nova versão) + total em R$ pt-BR. Aprovados são imutáveis via guard server + trigger SQL
- **Entregas enriquecidas** — campo Motorista + badge "✓ comprovante anexado" quando `receipt_file_id` preenchido + aviso âmbar quando delivered sem comprovante
- **Mensagens com reply-to** — botão "responder" (hover), banner dourado no composer com quote da parent, cada reply exibe card de quote inline (border-l dourada)

### Tranche C · Dashboard executivo + Cmd+K + Filtros
- **Recharts** adicionado ao stack (^2.15.4)
- `features/dashboard/queries.ts` massivamente expandido: casos por status/dia, revenue mensal, rankings, atividades
- 3 gráficos custom SSR-safe: `CasesLast30dChart` (line com gradient dourado), `CasesByStatusChart` (bar horizontal PT-BR), `RevenueLast6MonthsChart` (bar vertical com formatter R$)
- Dashboard reescrito: 8 KPIs cliqueáveis (casos em produção, atrasados, rascunhos, faturamento, leads, clientes, dentistas, clínicas) · row de charts · rankings (top dentistas, top trabalhos, pipeline compact) · últimas atividades com timeAgo
- **Command Palette ⌘K** — `features/search/actions.ts::globalSearchAction()` consulta paralela em cases/dentists/clinics/leads com RLS. `<CommandPalette>` com atalho global, debounce 220ms, quick actions default, navegação ↑↓, badges por tipo, footer com hints
- **Filtros avançados em `/casos`** — pills de SLA + selects Status/Prioridade (via `<FilterSelect>` client) + botão limpar. URL params bookmarkable (`?status=&priority=&sla=`). Busca preserva filtros ativos

### Tranche D · Automação (auditoria + notificações)
- **Migration 0035** — trigger `log_audit_change()` genérico (SECURITY DEFINER) em 9 tabelas: profiles, cases, case_files, quotes, planning_versions, deliveries, clinics, dentists, leads. Skip auto de seed writes + updated_at-only updates. Detecta `cases.status_changed` como action específica
- **Migration 0036** — helpers `notify_org_admins()` + `notify_user()` + triggers de negócio:
  - `case_message` → notifica commercial_owner + technical_owner (skip autor)
  - `case draft → submitted` → notifica commercial_owner + admins
  - `case status change` → notifica technical/production owner
  - `quote → approved` → broadcast admins com valor total
  - `delivery → delivered` → notifica commercial_owner
- **Página `/audit`** (super_admin/admin only) — últimos 200 eventos com ícone por entidade, badge colorido por ação (Criado/Editado/Status/Removido), resumo inteligente do JSONB, prev→next inline em status changes, autor + email + hora. Sidebar item "Auditoria" (Shield)

### Tranche E · Fechamento (esta entrega)
- **Rate limiting** — `src/lib/rate-limit.ts` in-memory bucket. Aplicado em:
  - `loginAction`: 8 tentativas / 5min por (IP + email) — anti brute force
  - `uploadCaseFileAction`: 30 uploads / 60s por usuário
  - `sendCaseMessageAction`: 60 mensagens / 60s por usuário
- **Compressão de imagem client-side** — `src/lib/image-compression.ts` via canvas nativo (zero deps). Reduz fotos ≥ 500KB (JPG/PNG/WebP) mantendo qualidade 0.85 até max 2400×2400. Aplicada em `FilesTab` no upload. Redução esperada 60-80% do payload
- **Loading skeletons** em `/casos/[id]` e `/checklists/[id]`
- **Cleanup** confirmado: zero `console.log` / `TODO` / `FIXME` na pasta `src`
- **Docs consolidadas** (este arquivo + docs/progress.md)

## Arquitetura consolidada

**Migrations aplicadas**: 0001–0036 (36 arquivos SQL)

**Tabelas de negócio**: organizations, profiles, audit_logs, consents, system_settings, case_types, case_checklist_templates, clinics, dentists, clinic_dentists, leads, lead_activities, patients, cases, case_status_history, case_checklist_items, case_files, case_messages, notifications, user_case_favorites, quotes, quote_items, quote_actions, planning_versions, planning_files, planning_actions, invoices, payments, deliveries

**Storage buckets** (todos privados): `avatars`, `case-files`, `planning-files`, `delivery-files`, `documents`

**Funções SQL principais**:
- Anti-recursão RLS: `current_user_organization_id()`, `current_user_role()`, `is_internal_user()`, `is_super_admin()`
- Case access: `user_can_access_case()`, `user_can_manage_case()`, `user_can_access_clinic()`
- Case number: `next_case_number()`, `next_quote_number()`, `next_invoice_number()`
- Case checklist: `instantiate_case_checklist(case_id)`, `refresh_case_health_score(case_id)`
- Case health: `calculate_case_health_score(case_id)` retorna `(score, missing, total_required)`
- Auditoria: `log_audit_change()` trigger genérico
- Notificação: `notify_org_admins()`, `notify_user()`, triggers específicos por evento

## Módulos vivos no SR HUB
| Sidebar | Rota | Descrição |
|---------|------|-----------|
| Dashboard | `/dashboard` | KPIs + charts + rankings + activities |
| CRM | `/leads` | Kanban drag-drop + `/leads/[id]` detail |
| Dentistas | `/dentistas` | Lista + `/dentistas/[id]` visão 360° |
| Clínicas | `/clinicas` | Lista + `/clinicas/[id]` com dentistas vinculados |
| Casos | `/casos` | Lista + filtros + `/casos/[id]` com 8 tabs |
| Checklists | `/checklists` | Templates admin CRUD |
| Auditoria | `/audit` | (admin only) log de operações |

**⌘K de qualquer lugar** abre o Command Palette com busca global.

## Segurança em camadas
1. Middleware Next.js — sessão + role guard + `must_change_password`
2. Layouts server-side — segunda checagem role + status
3. Server Actions — validação Zod + rate limit + verificação auth
4. RLS Postgres — última linha de defesa (enable+force em todas as tabelas)
5. Storage RLS por path (`org_id/case_id/category/uuid-file`)
6. Signed URLs de curta duração (60s download, 300s preview)
7. Notas internas (`visibility='internal'`) nunca vazam para dentista via RLS
8. Rate limit anti brute force em login (8/5min por IP+email)

## Performance
- Server Components + queries paralelas (`Promise.all`) em todas as list pages
- Zero N+1: `listQuoteItems()`, `countFilesPerChecklistItem()`, `listCases` com joins
- `revalidatePath()` targeted após cada mutation
- Skeletons via `loading.tsx` (server data fetching não-bloqueante)
- Image compression client-side reduz payload
- Optimistic UI em: LeadsKanban drag-drop, checklist toggle, file link/remove, delivery status, notifications mark-read, message send

## Compliance / LGPD
- `patients` tabela com minimização de dados (código + iniciais, sem nome completo obrigatório)
- `consents` para LGPD (versão + IP + user_agent + timestamp)
- `audit_logs` append-only (RLS bloqueia UPDATE/DELETE por non-service-role)
- Nenhum public URL de arquivos clínicos

## Próximo — Fase 4
**Portal do Dentista** (rota `/portal/*`):
- Fluxo do dentista: cadastro → confirmação → login → dashboard próprio
- Enviar novo caso com wizard multi-step + upload direto
- Visualizar checklist do caso + Health Score
- Aprovar/recusar orçamento (com IP + user_agent + timestamp de aceite)
- Aprovar/pedir alteração no planejamento
- Chat com o laboratório
- Acompanhar entrega + confirmar recebimento
- Baixar comprovante fiscal
- Fase 4 vai reaproveitar todas as tabelas e RLS já criadas — só adiciona UI.
