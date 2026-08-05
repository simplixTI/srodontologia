# Suporte e SLA

## Severidades

| Sev | Definição | Exemplo | SLA resposta | SLA resolução |
|---|---|---|---|---|
| **SEV-1** | Plataforma indisponível OU vazamento de dados OU billing quebrado para todos | Login fora do ar; cartão duplicando; RLS bypass | 1h | 4h |
| **SEV-2** | Fluxo crítico indisponível para 1+ tenants | Um tenant não consegue criar caso; upload falhando | 4h | 24h |
| **SEV-3** | Falha parcial com workaround | Painel de jobs lento; branding não aplicando; export LGPD travado | 24h | 5 dias úteis |
| **SEV-4** | Dúvida, melhoria, cosmético | Como configurar 2FA; texto errado; ícone quebrado | 3 dias úteis | Roadmap |

## Sistema

`support_tickets` (tabela — expandida em migration 0041 com `sla_hours`, `sla_due_at`, `first_response_at`):

```sql
select
  st.id, st.subject, st.priority, st.status,
  st.created_at,
  st.first_response_at,
  st.sla_due_at,
  case when st.sla_due_at < now() and st.first_response_at is null then 'BREACHED'
       when st.first_response_at is null and st.sla_due_at is not null then 'PENDING'
       else 'OK' end as sla_status,
  o.name as tenant
from support_tickets st
join organizations o on o.id = st.organization_id
where st.status not in ('closed','resolved')
order by st.priority desc, st.created_at;
```

## Fluxo

1. Cliente abre ticket via `/suporte`
2. Sistema calcula `sla_hours` baseado na `priority`:
   - urgent → 1h
   - high → 4h
   - medium → 24h
   - low → 72h
3. `sla_due_at = created_at + sla_hours`
4. Painel `/super-admin/suporte` mostra tickets ordenados por urgência
5. Ao responder pela primeira vez → set `first_response_at = now()`

## Escalonamento

- Sem resposta em 50% do SLA → alerta em `#suporte-plataforma`
- SLA breached → alerta severity=error → notificar responsável

## Canais

Configurar `notification_channels`:
- `slack` → `#suporte-plataforma` para alertas
- `email` → equipe

## Horário

Business hours: 8h-18h dias úteis (Brasília). Fora disso, apenas SEV-1 tem SLA garantido.

## Contatos de emergência

(A preencher antes do go-live)
- Owner técnico principal: ______
- On-call sec (SEV-1): ______
- Contato Stripe (para chargebacks): ______
- Contato Supabase (suporte pro): ______
