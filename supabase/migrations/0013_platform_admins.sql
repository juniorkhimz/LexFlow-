-- Platform admins are people who work for the SaaS operator (you), not for
-- any customer firm. This is a fundamentally different privilege domain
-- from profiles.role = 'admin', which is scoped to one firm by RLS
-- everywhere else in the schema. Deliberately NOT modeled as "give some
-- profiles a special flag that bypasses RLS" — that pattern is how
-- accidental cross-tenant data leaks happen. Instead:
--
--   1. platform_admins is its own table, unrelated to any firm_id.
--   2. Its RLS policy only ever lets someone check THEIR OWN membership
--      (id = auth.uid()) — never list or infer other admins, never see
--      firm data through this table directly.
--   3. Actual cross-firm reads (list all firms, aggregate revenue, etc.)
--      happen ONLY through Edge Functions using the service-role key,
--      which re-verifies platform-admin status server-side on every call.
--      There is no RLS policy anywhere in this schema that grants a
--      platform admin blanket read access to firms/clients/matters/etc —
--      that would be a much larger, harder-to-audit hole than a handful
--      of narrow, purpose-built Edge Functions.
--
-- Add a platform admin the same way you'd edit plan_limits — direct SQL,
-- not through the app:
--   insert into platform_admins (id, full_name) values ('<their auth.users.id>', 'Your Name');

create table platform_admins (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

alter table platform_admins enable row level security;

create policy "self check platform_admin membership" on platform_admins
  for select using (id = auth.uid());
-- No insert/update/delete policy for any authenticated role, and no
-- policy letting a platform admin see OTHER platform admins — add/remove
-- them via SQL as the Postgres superuser, deliberately out of the app's
-- own privilege system.

create or replace function is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from platform_admins where id = auth.uid());
$$;
grant execute on function is_platform_admin() to authenticated;
