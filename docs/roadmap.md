# SR HUB · Roadmap

## FASE 1 · Fundação (ATUAL — pronto)
- [x] Arquitetura documentada
- [x] Setup Next.js + Tailwind + Framer Motion (já existia do site público)
- [x] Deps adicionadas: `@supabase/ssr`, `@supabase/supabase-js`, `@tanstack/react-query`, `react-hook-form`, `zod`, `resend`, `date-fns`, `server-only`
- [x] Estrutura de pastas Next App Router com route groups `(auth)`, `(hub)`, `(portal)`
- [x] Clientes Supabase: browser, server, admin (SERVICE ROLE), middleware
- [x] Middleware: refresh de sessão + guard de rotas + `must_change_password` + role routing
- [x] Migrations 0001–0011 (extensions, enums, org, profiles, RLS helpers, RLS, audit, consents, settings, seed)
- [x] Funções RLS SECURITY DEFINER anti-recursão
- [x] RBAC de UI (`src/lib/permissions/can.ts`) + labels de roles
- [x] Validações Zod (login, forgot, reset, change)
- [x] Server Actions de auth (5)
- [x] Páginas: `/login`, `/forgot-password`, `/reset-password`, `/change-password`
- [x] Layout HUB (Sidebar recolhível + Header com menu de perfil + logout)
- [x] Dashboard placeholder com KPIs mockados e roadmap visível
- [x] Portal do dentista placeholder
- [x] Script `create-admin.mjs` para bootstrap da Aline
- [x] `/admin` legacy → redirect para `/login`
- [x] Endpoint `/api/health`
- [x] Docs: architecture, database, permissions, setup, roadmap

## FASE 2 · CRM + cadastros
- [ ] Migrations: `clinics`, `dentists`, `leads`, `commercial_activities`
- [ ] RLS espelhando o padrão da Fase 1
- [ ] Página `/crm` com Kanban (drag-and-drop) das etapas comerciais
- [ ] CRUD de clínicas
- [ ] CRUD de dentistas com visão 360°
- [ ] Conversão de lead → dentista
- [ ] Filtros, busca, ordenação

## FASE 3 · Casos clínicos (interno)
- [ ] Migrations: `patients` (com minimização LGPD), `cases`, `case_status_history`, `case_files`
- [ ] Buckets no Supabase Storage: `case-files`
- [ ] Upload multi-arquivo com progresso, checksum, categoria, versão
- [ ] Timeline do caso
- [ ] Numeração automática `SR-000001`

## FASE 4 · Portal do Dentista (real)
- [ ] Home com botão "Novo caso" + resumo do dia
- [ ] Formulário multi-etapa de novo caso
- [ ] Acompanhamento de casos, mensagens (visíveis vs internas)
- [ ] Notificações no portal

## FASE 5 · Orçamentos
- [ ] Migrations: `quotes`, `quote_items`, `quote_actions`
- [ ] Múltiplas versões, aprovação/rejeição pelo dentista
- [ ] Termo de aceite com IP/user-agent registrados

## FASE 6 · Planejamento técnico
- [ ] Migrations: `planning_versions`, `planning_actions`
- [ ] Anexos + descrição técnica + aprovação pelo dentista
- [ ] Bloqueio de versão após aprovação

## FASE 7 · Produção
- [ ] Migrations: `production_tasks`, `quality_checks`
- [ ] Kanban produtivo (Fila → Impressão 3D → Fresagem → Acabamento → QC → Pronto)
- [ ] Apontamento de tempo, checklist QC configurável

## FASE 8 · Financeiro + entregas + notificações
- [ ] Migrations: `invoices`, `payments`, `refunds`, `deliveries`, `case_messages`, `notifications`, `notification_templates`
- [ ] Serviço de notificações desacoplado (fila)
- [ ] Integração Resend para e-mail transacional
- [ ] Preparar (não integrar ainda) gateway de pagamento

## FASE 9 · Relatórios + auditoria + testes
- [ ] Relatórios: casos, faturamento, funil, ticket médio, tempo médio, retrabalho
- [ ] Exportação CSV/PDF
- [ ] Testes E2E cobrindo o cenário "Dentista A não vê caso do Dentista B"
- [ ] Testes de RLS por role

## Backlog contínuo
- [ ] Command menu (⌘K) global
- [ ] Central de notificações in-app com Realtime
- [ ] Tema claro (arquitetura pronta, ativação a definir)
- [ ] SSO (Google, Microsoft) — só quando solicitado
- [ ] Magic link login
- [ ] i18n (pt-BR default, en-US no futuro)
