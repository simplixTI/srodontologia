-- =============================================================
-- 0015 · Enums for Phase 3 (cases, files, messages, notifications)
-- =============================================================

do $$ begin
  create type public.case_status as enum (
    'draft',
    'submitted',
    'under_review',
    'missing_information',
    'quote_preparation',
    'quote_sent',
    'awaiting_quote_approval',
    'quote_changes_requested',
    'quote_approved',
    'awaiting_payment_condition',
    'technical_planning',
    'awaiting_planning_approval',
    'planning_changes_requested',
    'planning_approved',
    'production_queue',
    'printing',
    'milling',
    'finishing',
    'quality_control',
    'ready_for_dispatch',
    'dispatched',
    'delivered',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_priority as enum ('low', 'normal', 'high', 'urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.file_visibility as enum ('internal', 'dentist', 'shared');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.message_visibility as enum ('internal', 'dentist');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.delivery_status as enum (
    'pending',
    'preparing',
    'ready_for_pickup',
    'dispatched',
    'in_transit',
    'delivered',
    'problem'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_channel as enum ('in_app', 'email', 'whatsapp', 'sms');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_status as enum ('pending', 'sent', 'read', 'failed', 'skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.customer_status as enum (
    'lead',
    'contacted',
    'presentation_scheduled',
    'presentation_completed',
    'first_case',
    'active_customer',
    'premium_customer',
    'inactive_customer',
    'lost'
  );
exception when duplicate_object then null; end $$;

-- Public-facing status shown to dentists (mapped from case_status server-side)
do $$ begin
  create type public.public_case_status as enum (
    'draft',
    'submitted',
    'in_review',
    'missing_information',
    'quote_available',
    'awaiting_your_approval',
    'in_planning',
    'planning_available',
    'in_production',
    'quality_control',
    'preparing_shipment',
    'shipped',
    'delivered',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

-- Map internal → public status (function used by portal views)
create or replace function public.map_case_status_to_public(s public.case_status)
returns public.public_case_status
language sql
immutable
as $$
  select case s
    when 'draft'                       then 'draft'::public.public_case_status
    when 'submitted'                   then 'submitted'
    when 'under_review'                then 'in_review'
    when 'missing_information'         then 'missing_information'
    when 'quote_preparation'           then 'in_review'
    when 'quote_sent'                  then 'quote_available'
    when 'awaiting_quote_approval'     then 'awaiting_your_approval'
    when 'quote_changes_requested'     then 'quote_available'
    when 'quote_approved'              then 'in_planning'
    when 'awaiting_payment_condition'  then 'quote_available'
    when 'technical_planning'          then 'in_planning'
    when 'awaiting_planning_approval'  then 'planning_available'
    when 'planning_changes_requested'  then 'planning_available'
    when 'planning_approved'           then 'in_production'
    when 'production_queue'            then 'in_production'
    when 'printing'                    then 'in_production'
    when 'milling'                     then 'in_production'
    when 'finishing'                   then 'in_production'
    when 'quality_control'             then 'quality_control'
    when 'ready_for_dispatch'          then 'preparing_shipment'
    when 'dispatched'                  then 'shipped'
    when 'delivered'                   then 'delivered'
    when 'completed'                   then 'completed'
    when 'cancelled'                   then 'cancelled'
  end;
$$;
