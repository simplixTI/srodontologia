# SR HUB · Fase 2B · Estado atual (audit)

Auditoria feita antes de iniciar a implementação da Fase 2B.

## Migrations aplicadas
| # | Arquivo | O que cria |
|---|---------|-----------|
| 0001 | extensions_and_enums | pgcrypto, citext; enums `user_role`, `user_status` |
| 0002 | updated_at | trigger genérico `set_updated_at()` |
| 0003 | organizations | tabela raiz multitenant |
| 0004 | profiles | espelho auth.users + role + must_change_password |
| 0005 | rls_helpers | funções SECURITY DEFINER anti-recursão |
| 0006 | organizations_rls | policies em organizations |
| 0007 | profiles_rls | policies em profiles |
| 0008 | audit_logs | tabela append-only + RLS |
| 0009 | consents | LGPD + RLS |
| 0010 | system_settings | key/value por org + RLS |
| 0011 | seed_sr_digital | organização SR Digital seedada |
| 0012 | case_types | tipos de trabalho + RLS |
| 0013 | case_checklist_templates | itens de checklist + enum `checklist_item_category` + RLS |
| 0014 | seed_default_checklists | 6 tipos + 33 itens seedados |

## Tabelas no banco (14)
`organizations`, `profiles`, `audit_logs`, `consents`, `system_settings`, `case_types`, `case_checklist_templates` — mais 7 tabelas internas do Supabase Auth.

## RLS helpers existentes
- `current_user_organization_id()`
- `current_user_role()`
- `is_super_admin()`
- `is_internal_user()`

## Funcionalidades entregues
- Autenticação (login, forgot, reset, change-password forçado no primeiro acesso)
- Middleware com fallback quando Supabase não configurado
- RBAC (`src/lib/permissions/{roles,can}.ts`) — 8 roles + matriz de abilities
- Layout HUB: Sidebar colapsável, Header com menu de perfil + logout
- Dashboard placeholder com KPI skeleton
- **Case Checklist Engine (admin CRUD 100% funcional)**: `/checklists` list, `/checklists/new`, `/checklists/[id]` editor com reorder/toggle/delete
- Portal do dentista: placeholder "em construção"
- Email transacional Resend com template welcome
- Scripts CLI: `hub:create-admin`, `hub:invite-user`

## Usuários cadastrados
- Aline Salgueiro (super_admin) · alinebabo@yahoo.com.br
- Bruno Nascimento (admin) · brucnascimento@gmail.com

## Placeholders atuais no HUB
Sidebar: **13 itens** marcados como "em breve":
CRM, Dentistas, Clínicas, Casos, Planejamento, Produção, Financeiro, Entregas, Agenda, Arquivos, Relatórios, Usuários, Configurações.

Os únicos itens ATIVOS: Dashboard, Checklists.

## O que NÃO existe (a Fase 2B vai criar)
Tabelas: `clinics`, `clinic_dentists`, `dentists`, `leads`, `lead_activities`, `patients`, `cases`, `case_status_history`, `case_checklist_items` (instância por caso), `case_files`, `case_messages`, `notifications`, `user_case_favorites`, `quotes`, `quote_items`, `quote_actions`, `planning_versions`, `planning_files`, `planning_actions`, `invoices`, `payments`, `deliveries`

Storage buckets: `avatars`, `case-files`, `planning-files`, `delivery-files`, `documents`

Módulos: CRM Kanban, CRUD de clínicas/dentistas, wizard de casos, timeline real, Case Health Score, upload de arquivos, mensagens por caso, notificações internas, orçamentos, planejamento, financeiro, entregas.

## Vercel + Supabase
- Site em produção: https://www.srodontologiadigital.com.br
- Vercel + Supabase integrados (env vars sincronizadas via integração oficial)
- Domínio Resend verificado
