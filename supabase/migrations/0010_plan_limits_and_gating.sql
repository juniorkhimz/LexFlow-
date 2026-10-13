-- Closes the "Billing shows a plan but nothing is restricted" gap.
-- plan_limits is genuine platform configuration — editable directly by you
-- (the SaaS operator) via SQL, not through the app, since these are your
-- product's tiers, not a firm's own settings. Keep the `plan` values here
-- in sync with subscriptions.plan's CHECK constraint (0008_subscriptions.sql)
-- and with src/lib/billing-plans.ts on the frontend — three places that
-- must agree, which is a known tradeoff of not having a single generated
-- source of truth; documented rather than silently risky.

create table plan_limits (
  plan text primary key,
  max_staff_users integer,       -- null = unlimited
  client_portal boolean not null default false
);

insert into plan_limits (plan, max_staff_users, client_portal) values
  ('free', 1, false),
  ('starter', 5, false),
  ('pro', 25, true),
  ('enterprise', null, true);

alter table plan_limits enable row level security;

-- Harmless to expose broadly — these are the product's own tier
-- definitions, not any firm's private data. Lets the frontend show
-- "3 of 5 seats used" and disable options it knows are gated, without a
-- round trip through a function for every render.
create policy "anyone authenticated can read plan_limits" on plan_limits
  for select using (auth.role() = 'authenticated');
-- No insert/update/delete policy for any app role — change tiers via SQL
-- directly, as the platform operator, not through the app.

-- Resolves a firm's ACTIVE plan, defaulting to 'free' if there's no
-- subscription row yet or its status isn't 'active' (trialing/past_due/
-- canceled/etc all fall back to 'free' limits, which is deliberately the
-- conservative choice).
create or replace function firm_plan(p_firm_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select plan from subscriptions where firm_id = p_firm_id and status = 'active'),
    'free'
  );
$$;

-- True if the firm can add one more staff (non-client) user, counting both
-- existing profiles and pending invitations so a firm can't dodge the
-- limit by sending a pile of invites beyond their seat count.
create or replace function can_invite_staff_user(p_firm_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_max int;
  v_current int;
begin
  select max_staff_users into v_max from plan_limits where plan = firm_plan(p_firm_id);
  if v_max is null then
    return true; -- unlimited on this plan
  end if;

  select
    (select count(*) from profiles where firm_id = p_firm_id and role <> 'client')
    + (select count(*) from invitations where firm_id = p_firm_id and status = 'pending' and role <> 'client')
  into v_current;

  return v_current < v_max;
end;
$$;

create or replace function firm_has_client_portal(p_firm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select client_portal from plan_limits where plan = firm_plan(p_firm_id)), false);
$$;

-- Replace the single blanket "for all" invitations policy with granular
-- ones so INSERT specifically carries the plan-limit checks, without
-- affecting select/update/delete (revoking an invitation should never be
-- blocked by a seat limit, for instance).
drop policy if exists "admins manage own firm invitations" on invitations;

create policy "admins select own firm invitations" on invitations
  for select using (firm_id = auth_firm_id() and auth_role() in ('admin', 'partner'));

create policy "admins insert own firm invitations" on invitations
  for insert with check (
    firm_id = auth_firm_id()
    and auth_role() in ('admin', 'partner')
    and ((role <> 'client' and can_invite_staff_user(firm_id)) or role = 'client')
    and ((role = 'client' and firm_has_client_portal(firm_id)) or role <> 'client')
  );

create policy "admins update own firm invitations" on invitations
  for update using (firm_id = auth_firm_id() and auth_role() in ('admin', 'partner'));

create policy "admins delete own firm invitations" on invitations
  for delete using (firm_id = auth_firm_id() and auth_role() in ('admin', 'partner'));

-- Re-created (not edited in place — migrations are append-only) to add a
-- safety-net check: the invitations INSERT policy above blocks sending an
-- over-limit invite in the first place, but a firm's plan could still
-- change (e.g. a downgrade) in the days between an invite being sent and
-- accepted. This re-checks at acceptance time too, so a stale invite can't
-- let someone in past a since-lowered seat limit or a since-removed
-- client-portal feature.
create or replace function accept_invitation(p_token uuid, p_full_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation invitations%rowtype;
  v_caller_email text;
begin
  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'Profile already exists for this user';
  end if;

  select * into v_invitation from invitations where token = p_token for update;
  if not found then
    raise exception 'Invitation not found';
  end if;
  if v_invitation.status <> 'pending' then
    raise exception 'This invitation has already been used or revoked';
  end if;
  if v_invitation.expires_at < now() then
    raise exception 'This invitation has expired';
  end if;

  select email into v_caller_email from auth.users where id = auth.uid();
  if v_caller_email is null or lower(v_caller_email) <> lower(v_invitation.email) then
    raise exception 'This invitation was sent to a different email address';
  end if;

  if v_invitation.role = 'client' then
    if not firm_has_client_portal(v_invitation.firm_id) then
      raise exception 'This firm''s current plan no longer includes the client portal. Ask them to upgrade first.';
    end if;
  else
    if not can_invite_staff_user(v_invitation.firm_id) then
      raise exception 'This firm has reached its staff user limit for its current plan.';
    end if;
  end if;

  insert into profiles (id, firm_id, full_name, email, role)
  values (auth.uid(), v_invitation.firm_id, p_full_name, v_caller_email, v_invitation.role);

  update invitations set status = 'accepted', accepted_at = now() where id = v_invitation.id;

  insert into activities (firm_id, user_id, action, entity_type, entity_id, metadata)
  values (v_invitation.firm_id, auth.uid(), 'user.joined', 'profile', auth.uid(),
          jsonb_build_object('role', v_invitation.role, 'via_invitation', v_invitation.id));

  return v_invitation.firm_id;
end;
$$;
grant execute on function accept_invitation(uuid, text) to authenticated;
