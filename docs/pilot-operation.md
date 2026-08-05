# Operação do piloto

## Release channels

Cada tenant tem um canal em `tenant_release_channels`:
- `internal` — desenvolvedores/testes SR
- `pilot` — 1º cliente (features novas primeiro, suporte prioritário)
- `beta` — clientes early access
- `production` — release estável (default)

Consulta:
```sql
select o.name, trc.channel
from organizations o
left join tenant_release_channels trc on trc.organization_id = o.id
where o.deleted_at is null;
```

Alterar via SQL ou via `/super-admin` (rota de gestão pendente).

## Feature flags por canal

Ativar feature X só em `pilot`:
```sql
insert into feature_flag_overrides (flag_key, target_type, target_id, enabled)
select 'ai.image_analysis', 'tenant', organization_id::text, true
from tenant_release_channels
where channel = 'pilot';
```

## Métricas do piloto

Consultar `product_analytics_events` para o tenant piloto:
```sql
select event, count(*), max(occurred_at)
from product_analytics_events
where organization_id = '<pilot_org_id>'
group by event
order by count desc;
```

Eventos-chave:
- `signup_completed` → `onboarding_completed` → `case_created` → `quote_approved`
- Tempo entre signup e primeiro caso = **time to first value**
- Ratio de `checkout_started` / `subscription_activated` = conversão

## Coleta de feedback

`FeedbackButton` (bottom-right em todo hub) grava em `product_feedback`. Filtrar por tenant piloto:
```sql
select kind, comment, route, created_at
from product_feedback
where organization_id = '<pilot_org_id>'
order by created_at desc;
```

Cada feedback pode ser vinculado a um `support_tickets` via `linked_ticket_id`.

## Comunicação

- Slack channel `#pilot-<tenant-slug>` — só time SR
- Reunião semanal 30min com owner do piloto
- Whatsapp para SEV-1 e SEV-2 (documentar contato)

## Critérios para promover a produção

- 30 dias sem SEV-1
- Feedback qualitativo positivo (score médio ≥ 4/5 em `product_feedback`)
- Métricas de uso condizentes com plano
- Cliente confirma que está pronto

Ao promover: alterar `tenant_release_channels.channel = 'production'`.
