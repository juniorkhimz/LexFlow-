-- Subscriptions represent a FIRM's paid access to LexFlow itself (the SaaS
-- subscription), as distinct from the quotes/invoices a firm sends to ITS
-- OWN clients (that's the `invoices` table, unrelated).
--
-- One row per firm. Status/plan here must only ever be written by the
-- stripe-webhook Edge Function (supabase/functions/stripe-webhook), which
-- runs with the service-role key and therefore bypasses RLS entirely. No
-- RLS policy below grants insert/update/delete to anyone — that's
-- deliberate: Stripe is the single source of truth for billing state, and
-- a client (even an admin) must never be able to grant itself a paid plan
-- by writing this table directly.

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null unique references firms(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'enterprise')),
  -- Mirrors Stripe subscription status strings directly rather than
  -- inventing our own enum, so the webhook handler can just pass it through.
  status text not null default 'inactive' check (
    status in ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid')
  ),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_subscriptions_firm on subscriptions(firm_id);
create index idx_subscriptions_stripe_customer on subscriptions(stripe_customer_id);

create trigger trg_set_updated_at before update on subscriptions
  for each row execute function set_updated_at();

alter table subscriptions enable row level security;

-- Read-only for the firm's own admins/partners — everyone else in the firm
-- doesn't need to see billing details. No insert/update/delete policy
-- exists for any role; only the service-role webhook can write this table.
create policy "admins select own firm subscription" on subscriptions
  for select using (firm_id = auth_firm_id() and auth_role() in ('admin', 'partner'));
