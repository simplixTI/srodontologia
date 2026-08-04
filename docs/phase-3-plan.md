# SR HUB · Fase 3 — Portal do Dentista

## Estado real antes desta fase (audit)

Migrations existentes (0001–0014):
- `organizations`, `profiles`, `audit_logs`, `consents`, `system_settings`
- `case_types`, `case_checklist_templates` (+ seed)

Módulos entregues:
- Autenticação (Supabase Auth + Server Actions + fallback env vars)
- RLS com funções SECURITY DEFINER anti-recursão
- RBAC (8 roles) + labels PT-BR
- Layout HUB (Sidebar + Header + Dashboard placeholder)
- Case Checklist Engine (admin CRUD completo)
- Email transacional (Resend) + template welcome
- Scripts CLI: `hub:create-admin`, `hub:invite-user`

Placeholders atuais que a Fase 3 vai eliminar:
- `/portal` — só um "Em construção"
- Sidebar HUB: 11 itens marcados "em breve" (CRM, Dentistas, Clínicas, Casos, Planejamento, Produção, Financeiro, Entregas, Agenda, Arquivos, Relatórios, Usuários, Configurações)

Ausente e necessário para o portal funcionar:
- Tabelas: `clinics`, `dentists`, `patients`, `cases`, `case_status_history`, `case_files`, `case_messages`, `quotes`, `quote_items`, `quote_actions`, `planning_versions`, `planning_actions`, `production_tasks`, `quality_checks`, `invoices`, `payments`, `deliveries`, `notifications`, `user_case_favorites`, `support_tickets`, `case_reviews`
- Storage buckets: `case-files`, `avatars`, `planning-files`, `delivery-files`
- Case Health Score (função + campo derivado)
- Numeração automática de casos (`SR-000001`)

## Escopo total da Fase 3

Fusiona o que originalmente eram Fases 2 + 3 + 4 + 5 + 6 + 8 do roadmap. Estimativa realista: 3–5 semanas para uma engenharia completa e testada.

Para não entregar placeholders, dividida em 5 sub-fases coerentes:

### 3a — Foundation (schema + storage) · **entrega imediata**
- Migrations: `clinics`, `dentists`, `patients`, `cases`, `case_status_history`, `case_files`, `case_messages`, `user_case_favorites`, `notifications`
- Enums: `case_status`, `case_priority`, `file_category`, `file_visibility`, `delivery_status`, `notification_type`
- RLS strict em todas: dentistas só vêem os próprios; internal filtra por role
- Storage bucket `case-files` (privado) + RLS de storage
- Case numbering helper (sequência por org)
- Case Health Score function (score calculado por trigger/view)
- Seed idempotente de 2 clínicas + 2 dentistas de demonstração ligados à Aline como commercial_owner

### 3b — Portal shell + dados (próxima entrega)
- Layout portal novo (mobile-first, bottom nav no mobile, sidebar compacta no desktop, botão "Novo caso" flutuante)
- Redesign `/portal` dashboard com saudação dinâmica, cards KPI, blocos "continuar rascunho / aprovações pendentes / próximas entregas / mensagens recentes / favoritos"
- `/portal/casos` — list com filtros (status/tipo/período/favorito) + busca + cards no mobile / tabela no desktop
- `/portal/casos/[id]` — header + abas Resumo, Timeline, Arquivos, Mensagens (as demais habilitadas conforme os dados existirem)
- `/portal/perfil` — editar dados básicos + preferências
- `/portal/primeiro-acesso` — wizard 9 etapas, registra consentimento LGPD
- Componente "Meu Consultor"
- Mapeamento status interno → status público

### 3c — Novo caso + upload
- `/portal/casos/novo` — wizard 5 etapas com **autosave** debounced (server action)
- Etapa 3 carrega checklist do `case_type` selecionado; cria `case_checklist_items` (nova tabela desta sub-fase)
- Upload real com signed URLs, drag-drop, câmera, múltiplos, retry, cancelamento
- Auto-classificação por extensão + nome (`superior.stl` → STL superior)
- **Case Health Score** calculado em tempo real (obrigatórios + arquivos mínimos + campos clínicos)
- Regra de envio: bloquear se score < 100% E `allow_incomplete_submission = false`
- Se `allow_incomplete_submission = true`: exigir justificativa + auditoria + status `missing_information`

### 3d — Aprovações + mensagens
- Migrations extra: `quotes`, `quote_items`, `quote_actions`, `planning_versions`, `planning_actions`
- `/portal/orcamentos` + `/portal/casos/[id]` aba Orçamento — visualizar, aprovar (com termo + IP + UA + texto de aceite imutável), recusar, solicitar alteração, versão nova ao editar
- `/portal/planejamentos` + aba Planejamento — versionar, aprovar bloqueia versão
- `/portal/mensagens` + aba Mensagens do caso — public messages only (internal_notes nunca vazam)
- Notificações internas para cada evento (nova mensagem, orçamento disponível etc.)

### 3e — Delivery + financeiro + suporte + biblioteca
- Migrations: `invoices`, `payments`, `deliveries`, `support_tickets`, `case_reviews`
- `/portal/entregas` — método, transportadora, rastreio (com URL quando existe), confirmar recebimento com timestamp+IP+observação
- `/portal/financeiro` — faturas do dentista/clínica, filtros (aberto/pago/vencido/parcelado), sem custos internos, sem margens
- `/portal/suporte` — meu consultor + ticket (assunto/categoria/descrição/anexo/caso relacionado)
- `/portal/biblioteca` — search+filter em casos históricos, ver arquivos compartilhados, duplicar (cria rascunho com `duplicated_from_case_id`, sem paciente/arquivos/aprovações)
- `/portal/notificacoes` — central completa (mark all read, preferências por evento)
- Case review após entrega confirmada (nota 1–5, autorização separada para depoimento)
- Adapters `EmailProvider` (usa Resend já configurado) e `WhatsAppProvider` (interface, sem chamada real)

## Segurança em camadas (aplicado em toda a Fase 3)

1. Middleware — sessão + role guard
2. Layout portal — segunda checagem
3. Query — sempre filtrando por `current_user_id` / `current_user_organization_id`
4. **RLS** — última linha de defesa
5. Signed URLs — curta duração para arquivos
6. Nunca expor `internal_notes` em queries do portal
7. Auditoria em toda ação relevante

## Cenários de teste críticos (definidos, testados em 3e)

1. Dentista A não acessa caso de Dentista B (curl + RLS test)
2. Dentista não recebe notas internas
3. Dentista não baixa arquivo `visibility='internal'`
4. Dentista não acessa orçamento de outro cliente
5. Orçamento aprovado é imutável
6. Planejamento aprovado é imutável
7. Duplicação não copia paciente/arquivos
8. Favoritos são por usuário
9. Signed URLs expiram
10. `status='suspended'` desloga
11. Envio incompleto bloqueado quando exception desligada
12. Consentimentos gravados com timestamp+IP+UA

## Docs a atualizar/criar

- [x] `phase-3-plan.md` (este)
- [ ] `portal-dentist.md` (3b)
- [ ] `portal-permissions.md` (3b — matriz de RLS)
- [ ] `case-health-score.md` (3c)
- [ ] `file-upload.md` (3c)
- [ ] `notifications.md` (3d)
- [ ] `support.md` (3e)
- [ ] `phase-3-testing.md` (3e)
- [ ] `progress.md` (atualizado a cada sub-fase)

## Pendências externas para conseguir testar

1. Aline precisa acessar SR HUB, criar 1 clínica e associar 1 dentista real (ou usaremos os 2 dentistas de demonstração seedados em 3a)
2. Bucket `case-files` será criado via SQL na 3a — sem ação manual
3. Se quisermos WhatsApp real na 3d/3e: credenciais de um provider (Twilio? Zenvia?) — apenas o adapter está preparado, integração real fica para fase futura
