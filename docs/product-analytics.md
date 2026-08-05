# Product analytics

## Provider

Camada abstrata em `src/lib/analytics/tracker.ts`. Implementação atual:
- **Postgres** — grava em `product_analytics_events` (nosso próprio DB, sempre)
- Opcionalmente pode ser estendida para PostHog / Amplitude / Mixpanel sem tocar callers.

## API

```ts
import { track } from '@/lib/analytics/tracker';

await track({
  event: 'case_created',
  organizationId,
  userId,
  properties: { case_type_id: id, priority: 'high' }
});
```

`track()` é fire-and-forget. Nunca throws.

## Eventos catalogados

- `signup_started`, `signup_completed`
- `onboarding_started`, `onboarding_step_completed`, `onboarding_completed`
- `case_created`
- `quote_approved`, `planning_approved`
- `first_value_reached` (dispara quando primeira aprovação de orçamento por dentista)
- `checkout_started`, `subscription_activated`
- `upgrade_completed`, `downgrade_completed`, `cancellation_requested`
- `support_ticket_created`
- `feedback_submitted`

Adicionar novos: incluir em `AnalyticsEvent` union type.

## Redação automática

Chaves bloqueadas: `password`, `secret`, `token`, `api_key`, `cookie`, `card`, `cvc`, `cvv`, `cpf`, `ssn`, `patient_name`, `clinical_description`, `material_notes`, `diagnosis`.

Strings > 500 chars são truncadas. Payload total > 4KB → registra `{ _truncated: true, size }`.

## Consultas úteis

### Funil de ativação
```sql
select event, count(distinct organization_id) as orgs, count(*) as events
from product_analytics_events
where event in ('signup_completed','onboarding_completed','case_created','checkout_started','subscription_activated')
  and occurred_at > now() - interval '30 days'
group by event;
```

### Time to first value
```sql
with signups as (
  select organization_id, min(occurred_at) as signup_at
  from product_analytics_events where event = 'signup_completed'
  group by organization_id
),
first_case as (
  select organization_id, min(occurred_at) as first_case_at
  from product_analytics_events where event = 'case_created'
  group by organization_id
)
select
  s.organization_id,
  s.signup_at,
  f.first_case_at,
  f.first_case_at - s.signup_at as time_to_first_value
from signups s
left join first_case f on f.organization_id = s.organization_id
order by signup_at desc;
```

### Cohort retention (semanal)
```sql
select
  date_trunc('week', signup_at) as cohort,
  extract(week from (event_at - signup_at)) as weeks_since_signup,
  count(distinct organization_id)
from (
  select ae.organization_id, ae.occurred_at as event_at,
    (select min(occurred_at) from product_analytics_events e2
     where e2.organization_id = ae.organization_id and e2.event = 'signup_completed') as signup_at
  from product_analytics_events ae
  where ae.event = 'case_created'
) t
where signup_at is not null
group by cohort, weeks_since_signup
order by cohort desc, weeks_since_signup;
```

## Nunca

- Enviar `patient_name`, `cpf`, `clinical_description`, ou anexo bruto
- Enviar dados de outra org
- Tornar analytics bloqueante para o fluxo do usuário
