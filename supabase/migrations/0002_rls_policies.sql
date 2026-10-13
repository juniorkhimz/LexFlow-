-- RLS strategy
-- =============
-- 1. Every table (except firms itself, handled specially) is scoped by firm_id.
-- 2. Helper functions read the CALLER's own profile row (auth.uid()) to get
--    their firm_id and role — never trust a firm_id passed from the client.
-- 3. 'client' role users get a narrower policy: only rows tied to *their own*
--    client_id (via profiles.id -> clients.profile_id), never the full firm.
-- 4. All helper functions are STABLE and SECURITY DEFINER so they can read
--    `profiles` even though `profiles` itself has RLS enabled, without
--    triggering recursive policy evaluation.

create or replace function auth_firm_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select firm_id from profiles where id = auth.uid();
$$;

create or replace function auth_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function auth_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from profiles where id = auth.uid()) <> 'client', false);
$$;

-- The client portal user's own clients.id (a client user may in principle
-- be linked to more than one client record, e.g. representing two entities).
create or replace function auth_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from clients where profile_id = auth.uid();
$$;

alter table firms enable row level security;
alter table profiles enable row level security;
alter table practice_areas enable row level security;
alter table leads enable row level security;
alter table clients enable row level security;
alter table matters enable row level security;
alter table matter_members enable row level security;
alter table tasks enable row level security;
alter table deadlines enable row level security;
alter table appointments enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;
alter table documents enable row level security;
alter table activities enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;

-- ---------------- firms ----------------
-- A user can only see their own firm; firm creation happens via a
-- SECURITY DEFINER RPC (see 0003_functions.sql: create_firm_and_owner)
-- rather than a direct insert policy, so we don't need an INSERT policy here.
create policy "select own firm" on firms
  for select using (id = auth_firm_id());

create policy "staff can update own firm" on firms
  for update using (id = auth_firm_id() and auth_role() in ('admin','partner'));

-- ---------------- profiles ----------------
create policy "select profiles in own firm" on profiles
  for select using (firm_id = auth_firm_id() or id = auth.uid());

create policy "update own profile" on profiles
  for update using (id = auth.uid());

create policy "admins manage firm profiles" on profiles
  for all using (firm_id = auth_firm_id() and auth_role() in ('admin','partner'));

-- ---------------- practice_areas ----------------
create policy "firm select practice_areas" on practice_areas
  for select using (firm_id = auth_firm_id());
create policy "staff manage practice_areas" on practice_areas
  for all using (firm_id = auth_firm_id() and auth_is_staff())
  with check (firm_id = auth_firm_id() and auth_is_staff());

-- ---------------- leads (staff only — clients never see raw leads) ----------------
create policy "staff select leads" on leads
  for select using (firm_id = auth_firm_id() and auth_is_staff());
create policy "staff manage leads" on leads
  for all using (firm_id = auth_firm_id() and auth_is_staff())
  with check (firm_id = auth_firm_id() and auth_is_staff());

-- ---------------- clients ----------------
create policy "staff select clients" on clients
  for select using (firm_id = auth_firm_id() and auth_is_staff());
create policy "staff manage clients" on clients
  for all using (firm_id = auth_firm_id() and auth_is_staff())
  with check (firm_id = auth_firm_id() and auth_is_staff());
create policy "client select own record" on clients
  for select using (id in (select auth_client_ids()));

-- ---------------- matters ----------------
create policy "staff select matters" on matters
  for select using (firm_id = auth_firm_id() and auth_is_staff());
create policy "staff manage matters" on matters
  for all using (firm_id = auth_firm_id() and auth_is_staff())
  with check (firm_id = auth_firm_id() and auth_is_staff());
create policy "client select own matters" on matters
  for select using (client_id in (select auth_client_ids()));

create policy "staff manage matter_members" on matter_members
  for all using (
    exists (select 1 from matters m where m.id = matter_id and m.firm_id = auth_firm_id() and auth_is_staff())
  );

-- ---------------- tasks / deadlines (internal only, never client-visible) ----------------
create policy "staff select tasks" on tasks
  for select using (firm_id = auth_firm_id() and auth_is_staff());
create policy "staff manage tasks" on tasks
  for all using (firm_id = auth_firm_id() and auth_is_staff())
  with check (firm_id = auth_firm_id() and auth_is_staff());

create policy "staff select deadlines" on deadlines
  for select using (firm_id = auth_firm_id() and auth_is_staff());
create policy "staff manage deadlines" on deadlines
  for all using (firm_id = auth_firm_id() and auth_is_staff())
  with check (firm_id = auth_firm_id() and auth_is_staff());

-- ---------------- appointments ----------------
create policy "staff select appointments" on appointments
  for select using (firm_id = auth_firm_id() and auth_is_staff());
create policy "staff manage appointments" on appointments
  for all using (firm_id = auth_firm_id() and auth_is_staff())
  with check (firm_id = auth_firm_id() and auth_is_staff());
create policy "client select own appointments" on appointments
  for select using (client_id in (select auth_client_ids()));

-- ---------------- quotes / quote_items ----------------
create policy "staff select quotes" on quotes
  for select using (firm_id = auth_firm_id() and auth_is_staff());
create policy "staff manage quotes" on quotes
  for all using (firm_id = auth_firm_id() and auth_is_staff())
  with check (firm_id = auth_firm_id() and auth_is_staff());
create policy "client select own quotes" on quotes
  for select using (client_id in (select auth_client_ids()));

create policy "staff manage quote_items" on quote_items
  for all using (
    exists (select 1 from quotes q where q.id = quote_id and q.firm_id = auth_firm_id() and auth_is_staff())
  );
create policy "client select own quote_items" on quote_items
  for select using (
    exists (select 1 from quotes q where q.id = quote_id and q.client_id in (select auth_client_ids()))
  );

-- ---------------- invoices / invoice_items ----------------
create policy "staff select invoices" on invoices
  for select using (firm_id = auth_firm_id() and auth_is_staff());
create policy "staff manage invoices" on invoices
  for all using (firm_id = auth_firm_id() and auth_is_staff())
  with check (firm_id = auth_firm_id() and auth_is_staff());
create policy "client select own invoices" on invoices
  for select using (client_id in (select auth_client_ids()));

create policy "staff manage invoice_items" on invoice_items
  for all using (
    exists (select 1 from invoices i where i.id = invoice_id and i.firm_id = auth_firm_id() and auth_is_staff())
  );
create policy "client select own invoice_items" on invoice_items
  for select using (
    exists (select 1 from invoices i where i.id = invoice_id and i.client_id in (select auth_client_ids()))
  );

-- ---------------- payments ----------------
create policy "staff select payments" on payments
  for select using (firm_id = auth_firm_id() and auth_is_staff());
create policy "staff manage payments" on payments
  for all using (firm_id = auth_firm_id() and auth_is_staff() and auth_role() in ('admin','partner','accountant'))
  with check (firm_id = auth_firm_id() and auth_is_staff() and auth_role() in ('admin','partner','accountant'));
create policy "client select own payments" on payments
  for select using (client_id in (select auth_client_ids()));

-- ---------------- documents ----------------
create policy "staff select documents" on documents
  for select using (firm_id = auth_firm_id() and auth_is_staff());
create policy "staff manage documents" on documents
  for all using (firm_id = auth_firm_id() and auth_is_staff())
  with check (firm_id = auth_firm_id() and auth_is_staff());
create policy "client select own documents" on documents
  for select using (client_id in (select auth_client_ids()));

-- ---------------- activities (read-only audit trail) ----------------
create policy "staff select activities" on activities
  for select using (firm_id = auth_firm_id() and auth_is_staff());
create policy "staff insert activities" on activities
  for insert with check (firm_id = auth_firm_id());
-- No update/delete policy for anyone: audit rows are append-only.

-- ---------------- messages ----------------
create policy "staff select messages" on messages
  for select using (firm_id = auth_firm_id() and auth_is_staff());
create policy "staff send messages" on messages
  for insert with check (firm_id = auth_firm_id() and auth_is_staff() and sender_id = auth.uid());
create policy "client select own messages" on messages
  for select using (client_id in (select auth_client_ids()));
create policy "client send own messages" on messages
  for insert with check (client_id in (select auth_client_ids()) and sender_id = auth.uid());

-- ---------------- notifications ----------------
create policy "select own notifications" on notifications
  for select using (profile_id = auth.uid());
create policy "update own notifications" on notifications
  for update using (profile_id = auth.uid());
create policy "system insert notifications" on notifications
  for insert with check (firm_id = auth_firm_id());
