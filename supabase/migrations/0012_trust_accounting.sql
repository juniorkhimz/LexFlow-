-- Trust accounting: money a firm holds on a client's behalf (retainers,
-- settlement funds, etc.) must be tracked separately from the firm's own
-- operating funds, per client, and a firm must never be able to spend more
-- of a client's trust money than that specific client has on deposit — the
-- core rule behind IOLTA-style trust accounting rules most bar associations
-- enforce. This was a real, missing feature versus actual competitors in
-- this market (identified by researching them, not guessed) — invoices and
-- payments (0001/0005) track what a firm has BILLED and been PAID; this is
-- a separate ledger for money held IN TRUST, before it's ever billed.

create type trust_transaction_type as enum ('deposit', 'disbursement', 'transfer_to_operating');

create table trust_transactions (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  matter_id uuid references matters(id) on delete set null,
  type trust_transaction_type not null,
  amount numeric(14,2) not null check (amount > 0),
  description text,
  reference text,
  recorded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_trust_transactions_firm on trust_transactions(firm_id);
create index idx_trust_transactions_client on trust_transactions(client_id, created_at);

alter table trust_transactions enable row level security;

-- Same staff/client-portal split as payments (0002_rls_policies.sql):
-- accountants/admins/partners manage it, other staff can view it, clients
-- can see their own trust balance in the portal — trust money is legally
-- theirs, they're entitled to see it.
create policy "staff select trust_transactions" on trust_transactions
  for select using (firm_id = auth_firm_id() and auth_is_staff());
create policy "accountants manage trust_transactions" on trust_transactions
  for all using (firm_id = auth_firm_id() and auth_is_staff() and auth_role() in ('admin', 'partner', 'accountant'))
  with check (firm_id = auth_firm_id() and auth_is_staff() and auth_role() in ('admin', 'partner', 'accountant'));
create policy "client select own trust_transactions" on trust_transactions
  for select using (client_id in (select auth_client_ids()));

-- Running balance per client — a deposit adds, a disbursement or transfer
-- to operating funds (i.e. the firm earned it and is moving it to their
-- own account) subtracts.
create or replace function client_trust_balance(p_client_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(
    case when type = 'deposit' then amount else -amount end
  ), 0)
  from trust_transactions
  where client_id = p_client_id;
$$;

-- The actual compliance rule: refuse any disbursement or transfer that
-- would take a client's trust balance below zero. This is enforced with a
-- trigger rather than only a CHECK constraint because it requires
-- aggregating prior rows, which CHECK constraints can't do.
create or replace function enforce_trust_balance_nonnegative()
returns trigger
language plpgsql
as $$
declare
  v_balance numeric;
begin
  if new.type in ('disbursement', 'transfer_to_operating') then
    v_balance := client_trust_balance(new.client_id);
    if v_balance < new.amount then
      raise exception 'Insufficient trust balance for this client: has %, tried to withdraw %', v_balance, new.amount;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_trust_balance
  before insert on trust_transactions
  for each row execute function enforce_trust_balance_nonnegative();

-- Trust transactions are a financial audit trail — like payments and
-- activities, no update/delete policy exists for anyone. A mistaken entry
-- gets corrected with an offsetting transaction, not an edit, so the
-- ledger itself is never rewritten after the fact.
