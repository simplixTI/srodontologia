-- =============================================================
-- 0044 · Fix crítico · `invoices` já existia desde 0028_financial
--
-- Bug em 0039: a Fase 6 (SaaS billing) declara `create table if
-- not exists public.invoices (...)` com um schema totalmente novo
-- (subscription_id, subtotal, discount, tax, issued_at, currency,
-- external_provider, external_ref, hosted_url, pdf_url, metadata).
--
-- Só que `public.invoices` já foi criada na migration 0028_financial
-- com propósito diferente (invoices operacionais do lab — case_id,
-- dentist_id, quote_id). Como `create table if not exists` é NO-OP
-- quando a tabela existe, as colunas novas nunca são adicionadas —
-- e o índice `invoices_org_idx (organization_id, issued_at desc)` da
-- 0039 quebra com: 'column "issued_at" does not exist'.
--
-- Fix: adicionar TODAS as colunas SaaS de forma idempotente ANTES
-- de rodar 0039. Esta migration é segura de aplicar mesmo em
-- ambientes que já rodaram 0039 (add column if not exists é NO-OP).
--
-- Nota: a tabela `invoices` agora carrega dois conjuntos de colunas
-- (operacional 0028 + SaaS 0039). Isso é aceito como dívida técnica
-- temporária; refatoração futura pode separar em `invoices` (SaaS)
-- e `case_invoices` (operacional).
-- =============================================================

-- Garante que o enum de status da fase SaaS existe (0039 cria, mas
-- se estamos rodando antes dela, precisa existir para a coluna).
do $$ begin
  create type public.invoice_status as enum (
    'draft', 'open', 'paid', 'past_due', 'void', 'refunded'
  );
exception when duplicate_object then null; end $$;

alter table public.invoices
  add column if not exists subscription_id   uuid,
  add column if not exists currency          text not null default 'BRL',
  add column if not exists subtotal          numeric(12,2) not null default 0,
  add column if not exists discount          numeric(12,2) not null default 0,
  add column if not exists tax               numeric(12,2) not null default 0,
  add column if not exists issued_at         timestamptz,
  add column if not exists external_provider text,
  add column if not exists external_ref      text,
  add column if not exists hosted_url        text,
  add column if not exists pdf_url           text,
  add column if not exists metadata          jsonb not null default '{}'::jsonb;

-- FK subscription_id → subscriptions só é possível depois que a
-- tabela subscriptions existir (criada em 0039). Adicionamos aqui
-- de forma condicional para não quebrar se rodar isolado.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'subscriptions')
     and not exists (
       select 1 from information_schema.table_constraints
        where table_schema = 'public'
          and table_name = 'invoices'
          and constraint_name = 'invoices_subscription_id_fkey'
     )
  then
    alter table public.invoices
      add constraint invoices_subscription_id_fkey
      foreign key (subscription_id) references public.subscriptions(id) on delete set null;
  end if;
end $$;
