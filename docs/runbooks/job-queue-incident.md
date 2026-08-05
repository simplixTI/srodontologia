# Runbook · Incidente de fila de jobs

## Sintomas comuns

- Alerta "Job em dead-letter"
- Fila crescendo (queued > 500)
- Nenhum job processado nas últimas horas
- Taxa de falha alta

## Diagnóstico rápido

```sql
-- Distribuição por status (última hora)
select status, count(*) from jobs
where created_at > now() - interval '1 hour'
group by status;

-- Jobs presos em running > 30min
select id, kind, locked_by, locked_at from jobs
where status = 'running' and locked_at < now() - interval '30 minutes';

-- Top erros
select kind, error, count(*) from jobs
where status in ('failed','dead_letter')
  and updated_at > now() - interval '24 hours'
group by kind, error
order by count desc
limit 20;

-- Cron rodou?
select name, status, started_at, error from cron_runs
where started_at > now() - interval '1 hour'
order by started_at desc;
```

## Ações

### Fila crescendo sem processar

1. Verificar se `/api/cron` está sendo chamado — ver `cron_runs`
2. Se cron não rodou: verificar Vercel Cron config + `CRON_SECRET`
3. Se rodou mas não processou: ver `processed=0` na resposta → workers não estão pegando jobs
   - Verificar se `bootstrapProcessors()` foi chamado (registrando kinds)
   - Restart deploy (Vercel → redeploy)

### Job travado em running

Se `locked_at < now - 30min`:
1. O cron `try_acquire_cron_lock` já libera crons abandonados (30min)
2. Para jobs individuais, reprocessar manual:
   ```sql
   update jobs set status='queued', locked_at=null, locked_by=null
   where id = '<JOB_ID>';
   ```
3. Investigar: por que travou? Processor sem timeout?

### Muitos jobs em dead-letter

1. Ver `/super-admin/jobs?status=dead_letter`
2. Agrupar por `kind` + `error` — mesmo problema em vários?
3. Se causa externa (provider down): esperar + reprocessar em massa:
   ```sql
   update jobs set status='queued', attempts=0, run_after=now(),
                   dead_lettered_at=null, dead_letter_reason=null, error=null
   where status='dead_letter' and kind='<KIND>' and dead_lettered_at > now() - interval '1 day';
   ```
4. Se causa nossa: hotfix no processor + reprocessar

### Cron não roda

1. Vercel dashboard → Cron → últimas execuções
2. `cron_runs` recentes?
3. Se nenhuma: `CRON_SECRET` errado? URL mudou?
4. Fallback manual: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://app.srdigital.com.br/api/cron`

## Prevenção

- `max_attempts` sensato por tipo de job (default 3 é conservador)
- Processors idempotentes SEMPRE
- Log estruturado em cada processor com correlation_id
- Alerta configurado para dead_letter automaticamente (já feito via `moveToDeadLetter`)
