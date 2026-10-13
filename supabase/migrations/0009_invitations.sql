-- Lets an existing firm add teammates, instead of every signup creating a
-- brand-new separate firm (the gap identified in conversation: multiple
-- people at one real firm had no way to end up in the same firm_id).

create table invitations (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  email text not null,
  role user_role not null default 'advocate',
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid references profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz
);

create index idx_invitations_firm on invitations(firm_id);
create index idx_invitations_token on invitations(token);
create index idx_invitations_email on invitations(firm_id, email) where status = 'pending';

alter table invitations enable row level security;

-- Only admins/partners of the firm can see or manage its invitations.
-- Deliberately NO select policy for anon/other roles — an unauthenticated
-- invitee reads invitation details through get_invitation_by_token() below
-- instead, which returns only the few non-sensitive fields needed to show
-- "you've been invited to join <firm> as <role>", not the whole table
-- (which would otherwise leak every pending invite's email address to
-- anyone who could guess or intercept a token).
create policy "admins manage own firm invitations" on invitations
  for all using (firm_id = auth_firm_id() and auth_role() in ('admin', 'partner'))
  with check (firm_id = auth_firm_id() and auth_role() in ('admin', 'partner'));

-- Public-safe lookup: called from the /invite/$token page BEFORE the
-- invitee has an account, so it must work for the anon role. Returns only
-- what's needed to render the invite screen — never the invitations table
-- directly, and never other firms' data.
create or replace function get_invitation_by_token(p_token uuid)
returns table (firm_name text, role user_role, email text, status text, expires_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select f.name, i.role, i.email, i.status, i.expires_at
  from invitations i
  join firms f on f.id = i.firm_id
  where i.token = p_token;
$$;
grant execute on function get_invitation_by_token(uuid) to anon, authenticated;

-- Called once the invitee has a real auth session (post-signup, whether
-- immediate or after confirming their email — mirrors the
-- create_firm_and_owner bootstrap pattern in 0003_functions.sql). Creates
-- their profile in the INVITING firm rather than a new one, and marks the
-- invitation used. Refuses to run twice for the same user, and refuses a
-- token that's expired, already used, or revoked.
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
