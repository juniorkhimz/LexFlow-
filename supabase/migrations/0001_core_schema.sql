-- LexFlow core schema
-- Every business record belongs to a firm (multi-tenant isolation via RLS,
-- enforced in 0002_rls_policies.sql).

create extension if not exists "pgcrypto";

-- ==========================================================
-- ENUMS
-- ==========================================================

create type user_role as enum (
  'admin', 'partner', 'advocate', 'paralegal', 'accountant', 'receptionist', 'client'
);

create type lead_status as enum (
  'new', 'contacted', 'conflict_check', 'under_review', 'qualified',
  'consultation_scheduled', 'quote_sent', 'converted', 'rejected'
);

create type lead_priority as enum ('low', 'medium', 'high', 'critical');

create type client_type as enum ('individual', 'company', 'organization');
create type kyc_status as enum ('pending', 'verified', 'rejected');

create type matter_status as enum (
  'intake', 'active', 'pending', 'on_hold', 'completed', 'closed'
);

create type task_status as enum ('todo', 'in_progress', 'completed', 'cancelled');
create type task_priority as enum ('low', 'medium', 'high', 'critical');

create type deadline_priority as enum ('low', 'medium', 'high', 'critical');
create type deadline_status as enum ('pending', 'completed', 'missed');

create type appointment_type as enum ('consultation', 'meeting', 'court', 'call', 'other');
create type appointment_status as enum ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');

create type quote_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired');
create type invoice_status as enum ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled');
create type payment_method as enum ('mpesa', 'bank_transfer', 'cash', 'card', 'other');

create type document_category as enum (
  'contracts', 'court_documents', 'correspondence', 'identification',
  'evidence', 'agreements', 'other'
);

-- ==========================================================
-- FIRMS & PROFILES
-- ==========================================================

create table firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  email text,
  phone text,
  address text,
  website text,
  currency text not null default 'KES',
  tax_rate numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- profiles.id == auth.users.id (1:1 extension of the auth user)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  firm_id uuid references firms(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role user_role not null default 'client',
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_firm on profiles(firm_id);
create index idx_profiles_role on profiles(firm_id, role);

create table practice_areas (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (firm_id, name)
);
create index idx_practice_areas_firm on practice_areas(firm_id);

-- ==========================================================
-- LEADS & CLIENTS
-- ==========================================================

create table leads (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  name text not null,
  company text,
  email text,
  phone text,
  practice_area_id uuid references practice_areas(id) on delete set null,
  status lead_status not null default 'new',
  advocate_id uuid references profiles(id) on delete set null,
  source text,
  priority lead_priority not null default 'medium',
  estimated_value numeric(14,2),
  notes text,
  converted_client_id uuid, -- fk added after clients table exists
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_leads_firm on leads(firm_id);
create index idx_leads_status on leads(firm_id, status);
create index idx_leads_advocate on leads(advocate_id);

create table clients (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  -- set only for portal-enabled clients; links to their auth user / profile
  profile_id uuid references profiles(id) on delete set null,
  full_name text not null,
  organization text,
  email text,
  phone text,
  address text,
  id_number text,
  client_type client_type not null default 'individual',
  kyc_status kyc_status not null default 'pending',
  notes text,
  lead_id uuid references leads(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_clients_firm on clients(firm_id);
create index idx_clients_profile on clients(profile_id);

alter table leads
  add constraint fk_leads_converted_client
  foreign key (converted_client_id) references clients(id) on delete set null;

-- ==========================================================
-- MATTERS
-- ==========================================================

create table matters (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  matter_number text not null,
  matter_name text not null,
  client_id uuid not null references clients(id) on delete cascade,
  practice_area_id uuid references practice_areas(id) on delete set null,
  advocate_id uuid references profiles(id) on delete set null,
  status matter_status not null default 'intake',
  description text,
  start_date date not null default current_date,
  progress smallint not null default 0 check (progress between 0 and 100),
  billed_amount numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firm_id, matter_number)
);
create index idx_matters_firm on matters(firm_id);
create index idx_matters_client on matters(client_id);
create index idx_matters_status on matters(firm_id, status);

create table matter_members (
  matter_id uuid not null references matters(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (matter_id, profile_id)
);

-- ==========================================================
-- TASKS & DEADLINES
-- ==========================================================

create table tasks (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  matter_id uuid references matters(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references profiles(id) on delete set null,
  priority task_priority not null default 'medium',
  status task_status not null default 'todo',
  due_date date,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tasks_firm on tasks(firm_id);
create index idx_tasks_matter on tasks(matter_id);
create index idx_tasks_assignee on tasks(assigned_to, status);

create table deadlines (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  matter_id uuid references matters(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  title text not null,
  description text,
  owner_id uuid references profiles(id) on delete set null,
  due_date timestamptz not null,
  priority deadline_priority not null default 'medium',
  status deadline_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_deadlines_firm on deadlines(firm_id);
create index idx_deadlines_due on deadlines(firm_id, due_date);
create index idx_deadlines_matter on deadlines(matter_id);

-- ==========================================================
-- APPOINTMENTS
-- ==========================================================

create table appointments (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  title text not null,
  client_id uuid references clients(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  matter_id uuid references matters(id) on delete set null,
  advocate_id uuid references profiles(id) on delete set null,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  type appointment_type not null default 'consultation',
  location text,
  notes text,
  status appointment_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index idx_appointments_firm on appointments(firm_id);
create index idx_appointments_date on appointments(firm_id, appointment_date);
create index idx_appointments_advocate on appointments(advocate_id);

-- ==========================================================
-- QUOTES
-- ==========================================================

create table quotes (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  quote_number text not null,
  client_id uuid not null references clients(id) on delete cascade,
  matter_id uuid references matters(id) on delete set null,
  status quote_status not null default 'draft',
  subtotal numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  currency text not null default 'KES',
  valid_until date,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firm_id, quote_number)
);
create index idx_quotes_firm on quotes(firm_id);
create index idx_quotes_client on quotes(client_id);
create index idx_quotes_status on quotes(firm_id, status);

create table quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  discount numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  sort_order smallint not null default 0
);
create index idx_quote_items_quote on quote_items(quote_id);

-- ==========================================================
-- INVOICES & PAYMENTS
-- ==========================================================

create table invoices (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  invoice_number text not null,
  client_id uuid not null references clients(id) on delete cascade,
  matter_id uuid references matters(id) on delete set null,
  quote_id uuid references quotes(id) on delete set null,
  status invoice_status not null default 'draft',
  subtotal numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  currency text not null default 'KES',
  due_date date,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firm_id, invoice_number)
);
create index idx_invoices_firm on invoices(firm_id);
create index idx_invoices_client on invoices(client_id);
create index idx_invoices_status on invoices(firm_id, status);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  discount numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  sort_order smallint not null default 0
);
create index idx_invoice_items_invoice on invoice_items(invoice_id);

-- payment_method is deliberately a plain field, not an integration:
-- see PHASE "PAYMENTS" — no real M-Pesa API call happens here, just
-- recording that a payment (however collected) was applied to an invoice.
create table payments (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  payment_date date not null default current_date,
  method payment_method not null default 'other',
  reference text,
  notes text,
  recorded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_payments_firm on payments(firm_id);
create index idx_payments_invoice on payments(invoice_id);

-- ==========================================================
-- DOCUMENTS
-- ==========================================================

create table documents (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  matter_id uuid references matters(id) on delete cascade,
  uploaded_by uuid references profiles(id) on delete set null,
  name text not null,
  storage_path text not null, -- path within the private 'documents' bucket
  category document_category not null default 'other',
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_documents_firm on documents(firm_id);
create index idx_documents_matter on documents(matter_id);
create index idx_documents_client on documents(client_id);

-- ==========================================================
-- ACTIVITIES (AUDIT LOG)
-- ==========================================================

create table activities (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  action text not null,       -- e.g. 'lead.created', 'invoice.paid'
  entity_type text not null,  -- e.g. 'lead', 'matter', 'invoice'
  entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_activities_firm on activities(firm_id, created_at desc);
create index idx_activities_entity on activities(entity_type, entity_id);

-- ==========================================================
-- MESSAGES & NOTIFICATIONS
-- ==========================================================

create table messages (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  matter_id uuid references matters(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (client_id is not null or matter_id is not null)
);
create index idx_messages_firm on messages(firm_id, created_at desc);
create index idx_messages_client on messages(client_id);
create index idx_messages_matter on messages(matter_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_profile on notifications(profile_id, read_at);

-- ==========================================================
-- updated_at trigger helper (shared)
-- ==========================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'firms','profiles','leads','clients','matters','tasks','deadlines',
    'appointments','quotes','invoices','documents'
  ]
  loop
    execute format(
      'create trigger trg_set_updated_at before update on %I
       for each row execute function set_updated_at();', t
    );
  end loop;
end $$;
