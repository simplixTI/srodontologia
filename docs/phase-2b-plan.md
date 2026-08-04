# SR HUB · Fase 2B — Plano de execução

## Escopo total (do prompt)
Núcleo operacional completo: 20+ tabelas, 5 buckets privados, CRM Kanban, CRUD de clínicas/dentistas/leads/pacientes, wizard de casos, checklist instanciado, Case Health Score real, upload de arquivos, timeline, mensagens, notificações internas, estrutura inicial de orçamentos/planejamento/financeiro/entregas, dashboard real.

Estimativa realista: **60–100 arquivos, 8000–15000 linhas de código**. Dividida em **5 tranches** para permitir teste incremental e não entregar placeholder disfarçado de feature.

## Tranche 1 · Foundation + CRUD Clínicas + Dentistas + Leads básico *(entrega imediata)*
- Migrations `0015`–`0033`: todas as tabelas + enums + storage buckets + RLS helpers extended + case_health_score function + demo seed
- Aplicar tudo no Supabase remoto via CLI
- Types + queries + validations base
- `/clinicas` — list, new, [id] view/edit + server actions
- `/dentistas` — list, new, [id] view/edit + server actions
- `/leads` — list + create (Kanban vai na Tranche 2)
- Sidebar: ativar CRM, Dentistas, Clínicas (deixar de ser "em breve")
- Docs: `phase-2b-current-state.md`, `phase-2b-plan.md`
- Commit + push
- Deploy verificado em produção

## Tranche 2 · Leads CRM (Kanban) + Dentistas 360°
- `/crm` — Kanban com drag-drop persistindo pipeline_stage no banco
- Lead activities (log de contato)
- Conversão de lead → dentista (mesmo indivíduo)
- Dentistas 360°: aba dados, aba clínicas, aba casos (vazia ainda), estatísticas
- Filtros, busca, paginação em todas as listagens
- Docs: `crm.md`

## Tranche 3 · Cases wizard + Checklist instanciado + Health Score
- `/casos` — list + filtros + busca
- `/casos/novo` — wizard 4 etapas com autosave via server action debounced
- Trigger: ao criar caso, instanciar `case_checklist_items` a partir do template ativo (com snapshots — não depende de alterações futuras do template)
- `case_health_score` function calculando em tempo real
- `/casos/[id]` — header + tabs Resumo, Checklist, Timeline
- Timeline conectada ao `case_status_history`
- Docs: `cases.md`, `case-health-score.md`

## Tranche 4 · File upload + Storage integration
- Upload real via Supabase Storage (bucket privado `case-files`)
- Drag & drop, múltiplos, retry, cancelamento, progresso
- Vínculo arquivo → item do checklist
- Auto-categorização por extensão
- Signed URLs de curta duração para download
- Preview de imagens, ícones para STL/OBJ/DICOM
- Exclusão lógica (`archived_at`)
- Rollback em caso de falha
- Docs: `uploads.md`, `storage.md`

## Tranche 5 · Timeline + Messages + Notifications + Quotes + Planning + Deliveries + Dashboard real
- Aba Mensagens no caso (public vs internal, dentista NUNCA vê internal)
- Central de notificações no header (badge + lista + mark-all-read)
- Orçamento interno básico (criar, listar, versionar — sem aprovação externa nesta tranche)
- Planejamento interno básico (criar, versionar)
- Financeiro (invoices/payments — view only)
- Entregas (criar, atualizar status)
- Dashboard HUB conectado aos dados reais (leads ativos, dentistas ativos, casos abertos, Health Score médio etc.)
- Docs: `notifications.md`, `phase-2b-testing.md`, `progress.md`

## Critério de conclusão da Fase 2B (do prompt original)
Ao final das 5 tranches, o operador interno consegue:
1. ✅ Cadastrar clínica
2. ✅ Cadastrar dentista
3. ✅ Criar lead
4. ✅ Converter lead
5. ✅ Criar paciente codificado
6. ✅ Criar caso
7. ✅ Gerar checklist a partir do template
8. ✅ Anexar arquivos
9. ✅ Vincular arquivos ao checklist
10. ✅ Visualizar Health Score real
11. ✅ Atualizar status
12. ✅ Visualizar timeline
13. ✅ Criar mensagem
14. ✅ Criar orçamento interno
15. ✅ Criar planejamento inicial
16. ✅ Criar entrega
17. ✅ Receber notificação interna
18. ✅ Visualizar dashboard real

## Riscos técnicos e mitigações
- **Case number concurrency** → uso de `sequence` PostgreSQL com `nextval` (safe under concurrent transactions)
- **Checklist template alteração após instância** → snapshots nos campos `*_snapshot` de `case_checklist_items` (item independente do template original)
- **Storage órfão** → wrap upload em server action que faz insert do metadata na mesma transação; se insert falhar, remove object; se object insert falhar antes, nada foi criado
- **RLS recursão** → seguir padrão SECURITY DEFINER já estabelecido
- **N+1 queries** → sempre usar joins ou `.select('*, related(*)')` do Supabase; medir com Vercel Analytics depois
- **Signed URLs longa duração** → 5 min max via config; regenerar sob demanda
