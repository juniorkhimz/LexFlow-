-- Demo requests from the public landing page. Anyone may INSERT (anon key);
-- nobody but platform admins can read. Validation lives here too, so it
-- holds even if the browser form is bypassed.
create table demo_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  firm_name text not null check (char_length(firm_name) between 2 and 160),
  phone text check (phone is null or char_length(phone) <= 40),
  firm_size text check (firm_size is null or firm_size in ('1', '2-5', '6-20', '21+')),
  preferred_date date,
  message text check (message is null or char_length(message) <= 2000),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed'))
);

alter table demo_requests enable row level security;

create policy "anyone can request a demo" on demo_requests
  for insert to anon, authenticated with check (status = 'new');
create policy "platform admins read demo requests" on demo_requests
  for select to authenticated using (is_platform_admin());

grant insert on demo_requests to anon, authenticated;
grant select on demo_requests to authenticated;
