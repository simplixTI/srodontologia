# SR Digital · Progresso do produto

Timeline canônica do desenvolvimento. Cada linha = um marco entregue em produção.

## 🏛️ Site institucional
- Site público em `srodontologiadigital.com.br` (Next.js 14, black + gold luxo)
- 8 seções: Hero, Why Us, Manifesto, How It Works (7 etapas), Technology (6 cards), Differential, Cases, Testimonials, Stats, CTA
- Rebranding: **SR Digital Center** (removido "Implant" para não restringir escopo)
- Textos institucionais atualizados (Planning Center + Laboratório CAD/CAM)
- WhatsApp float + Back to top + custom cursor

## 🔐 Fase 1 · Fundação
- Supabase + `@supabase/ssr` (browser/server/admin/middleware clients)
- 11 migrations: organizations, profiles, audit_logs, consents, system_settings + RLS helpers SECURITY DEFINER
- RBAC 8 roles + label PT-BR
- Middleware refresh + guard + must_change_password
- Auth pages: login, forgot, reset, change-password (mandatory first login)
- Sidebar HUB (13 items) + Header com perfil
- Script `create-admin.mjs` (Aline como super_admin)
- Email Resend + template de welcome
- Site em produção Vercel + Supabase integração

## 📋 Fase 2 · Case Checklist Engine
- Migrations 0012-0014: `case_types` + `case_checklist_templates` + seed com 6 tipos e 33 itens
- `/checklists` list + `/checklists/[id]` editor (drag-drop reorder, toggle obrigatório, edição inline, dentist preview live)
- `/checklists/new` criar tipo

## 🏭 Fase 2B · Operational Core (5 tranches)
- **T1** — 19 migrations + storage buckets + demo seed (2 clínicas + 3 dentistas)
- **T1** — CRUD clínicas + dentistas + leads básico
- **T2** — Kanban drag-drop leads · Conversão lead→dentista · Dashboard real
- **T3** — Casos: wizard, checklist instanciado, Case Health Score real
- **T4** — Upload real via Supabase Storage + auto-classificação + preview + signed URLs
- **T5** — Messages · Notifications bell · Deliveries · Quotes · Planning

## 🚀 Fase 3 · Módulo Operacional (5 tranches)
- **T-A** — UX foundations: Sonner, Radix Dialog, ConfirmProvider, Skeleton, Breadcrumbs, 404 elegante
- **T-B** — SLA engine + orçamentos ricos com itens + entregas com motorista/comprovante + mensagens reply
- **T-C** — Dashboard executivo com Recharts + Command Palette ⌘K + filtros avançados em `/casos`
- **T-D** — Auditoria automática (migration 0035) + notificações automáticas (migration 0036) + página `/audit`
- **T-E** — Rate limit + compressão de imagem client-side + skeletons finais + docs consolidadas

## ⏭️ Próximo · Fase 4 — Portal do Dentista
- Rota `/portal/*`, layout dedicado mobile-first
- Wizard novo caso (arquivos, checklist, HealthScore)
- Aprovar orçamento com IP + user_agent
- Aprovar planejamento
- Chat com laboratório
- Confirmar recebimento entrega
- Baixar comprovante
- Convidar clínica

Reutiliza todo o backend já pronto — só adiciona UI dentro dos RLS que já bloqueiam dentistas de ver notas internas / custos / margens / etc.

## Números atuais
- **36 migrations** aplicadas no Supabase (0001-0036)
- **~30 tabelas** com RLS strict
- **5 storage buckets** privados
- **~85 arquivos** em `src/` (componentes + features + actions)
- **~7 rotas HUB ativas** (Dashboard, CRM, Dentistas, Clínicas, Casos, Checklists, Auditoria)
- **~10 rotas HUB detail** (`/[id]` de cada módulo + `/novo`)
- Auth pages, portal placeholder, /admin legacy redirect
