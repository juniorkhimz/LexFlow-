-- On sign-up, a brand-new auth user has no profile yet, so auth_firm_id()
-- returns null and they can't satisfy any firm-scoped RLS policy — including
-- the one needed to insert their own firm. This SECURITY DEFINER function
-- runs with elevated privilege for exactly this one bootstrap action, and
-- nothing else: it creates the firm and the caller's own profile as 'admin',
-- and refuses to run again for a caller who already has a profile.
create or replace function create_firm_and_owner(
  p_firm_name text,
  p_full_name text,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_firm_id uuid;
begin
  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'Profile already exists for this user';
  end if;

  insert into firms (name) values (p_firm_name) returning id into v_firm_id;

  insert into profiles (id, firm_id, full_name, email, role)
  values (auth.uid(), v_firm_id, p_full_name, p_email, 'admin');

  insert into activities (firm_id, user_id, action, entity_type, entity_id, metadata)
  values (v_firm_id, auth.uid(), 'firm.created', 'firm', v_firm_id, jsonb_build_object('name', p_firm_name));

  return v_firm_id;
end;
$$;

-- Convert a lead into a client, linking the two and logging it in one
-- transaction so a partial conversion can never happen.
create or replace function convert_lead_to_client(p_lead_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead leads%rowtype;
  v_client_id uuid;
begin
  select * into v_lead from leads where id = p_lead_id and firm_id = auth_firm_id();
  if not found then
    raise exception 'Lead not found or not in your firm';
  end if;
  if not auth_is_staff() then
    raise exception 'Not authorized';
  end if;

  insert into clients (firm_id, full_name, organization, email, phone, notes, lead_id)
  values (v_lead.firm_id, v_lead.name, v_lead.company, v_lead.email, v_lead.phone, v_lead.notes, v_lead.id)
  returning id into v_client_id;

  update leads set status = 'converted', converted_client_id = v_client_id where id = p_lead_id;

  insert into activities (firm_id, user_id, action, entity_type, entity_id, metadata)
  values (v_lead.firm_id, auth.uid(), 'lead.converted', 'lead', p_lead_id,
          jsonb_build_object('client_id', v_client_id));

  return v_client_id;
end;
$$;
