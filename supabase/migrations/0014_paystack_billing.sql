-- Swaps the billing provider from Stripe to Paystack. Kenya is not a
-- Stripe-supported country (confirmed via research during this session —
-- Stripe requires a US/UK/other-supported-country entity, a US EIN, and a
-- US bank account to use from Kenya, which isn't a reasonable ask for this
-- product). Paystack (owned by Stripe, but a genuinely separate platform)
-- operates directly in Kenya with M-Pesa support.
--
-- ADDITIVE ONLY, per architecture discipline: the existing stripe_customer_id
-- and stripe_subscription_id columns are NOT dropped — no live subscription
-- ever used them (this integration never went past test mode), but the rule
-- is the rule regardless of whether data exists yet. They simply go unused
-- going forward. Same for the `plan` column and its CHECK constraint, which
-- is untouched — plan tiers (free/starter/pro/enterprise) are a LexFlow
-- concept, independent of which payment processor is behind them.

alter table subscriptions
  add column paystack_customer_code text unique,
  add column paystack_subscription_code text unique,
  add column paystack_email_token text; -- required by Paystack's subscription/disable API alongside the subscription code

-- Paystack's subscription.status values differ from Stripe's, so the
-- existing CHECK constraint (written for Stripe's vocabulary) needs
-- replacing — not a type change, not a data-destructive change, just a
-- different set of allowed strings. 'inactive' is kept as LexFlow's own
-- "no subscription yet" bootstrap default (used before any provider is
-- ever involved), not a Paystack value.
--
-- Looks up the constraint by column rather than assuming Postgres's
-- default auto-generated name (subscriptions_status_check) — that name is
-- very likely correct here (0008_subscriptions.sql defined it as an
-- unnamed inline column CHECK, which follows that convention), but this
-- migration verifies it against the live schema instead of hardcoding a
-- guess about a database this session can't directly inspect.
do $$
declare
  v_constraint_name text;
begin
  select con.conname into v_constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
  where rel.relname = 'subscriptions'
    and con.contype = 'c'
    and att.attname = 'status';

  if v_constraint_name is null then
    raise exception 'Could not find the status CHECK constraint on subscriptions — inspect the table manually before proceeding.';
  end if;

  execute format('alter table subscriptions drop constraint %I', v_constraint_name);
end $$;

alter table subscriptions add constraint subscriptions_status_check check (
  status in ('inactive', 'active', 'non-renewing', 'attention', 'completed', 'cancelled')
);

-- firm_plan(), can_invite_staff_user(), firm_has_client_portal(), and
-- can_upload_document() (0010/0011) all key off status = 'active', which
-- is unchanged in the new vocabulary — no changes needed to those
-- functions. Confirmed by inspection before writing this migration, not
-- assumed.
