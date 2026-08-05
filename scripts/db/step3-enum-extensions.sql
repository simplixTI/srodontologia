-- =============================================================
-- STEP 3 · Extensões de enum (pré-requisito para STEP 4)
--
-- PostgreSQL proíbe usar um valor de enum recém-adicionado na
-- mesma transação. Rodar isto em SUBMISSÃO SEPARADA garante
-- que o commit acontece antes do STEP 4 usar esses valores em
-- índices e views.
--
-- Idempotente (add value if not exists).
-- Pré-requisito: STEP 2 executado (cria os enums base).
-- =============================================================

alter type public.job_status add value if not exists 'dead_letter';
alter type public.job_kind   add value if not exists 'lgpd_export';
alter type public.job_kind   add value if not exists 'lgpd_deletion';
alter type public.job_kind   add value if not exists 'domain_verify';
alter type public.job_kind   add value if not exists 'domain_revalidate';
alter type public.job_kind   add value if not exists 'csv_import';
alter type public.job_kind   add value if not exists 'billing_reconcile';
alter type public.job_kind   add value if not exists 'device_alert';
