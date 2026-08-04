-- =============================================================
-- 0034 · deliveries: driver_name + receipt_file_id
-- Additive migration for Fase 3 · Tranche B (motorista + comprovante)
-- =============================================================

alter table public.deliveries
  add column if not exists driver_name text,
  add column if not exists receipt_file_id uuid references public.case_files(id) on delete set null;

create index if not exists deliveries_receipt_idx on public.deliveries (receipt_file_id) where receipt_file_id is not null;
