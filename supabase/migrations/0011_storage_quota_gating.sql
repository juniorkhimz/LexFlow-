-- Extends plan_limits (0010) to also cap document storage per firm —
-- closes another item from the "other conceivable limits" note in that
-- migration's README section. Same pattern: real enforcement at the
-- database write path, not just a UI suggestion.

alter table plan_limits
  add column max_documents integer,   -- null = unlimited
  add column max_storage_mb integer;  -- null = unlimited

update plan_limits set max_documents = 20, max_storage_mb = 100 where plan = 'free';
update plan_limits set max_documents = 500, max_storage_mb = 2000 where plan = 'starter';
update plan_limits set max_documents = 5000, max_storage_mb = 20000 where plan = 'pro';
update plan_limits set max_documents = null, max_storage_mb = null where plan = 'enterprise';

-- True if the firm can store one more document of p_additional_bytes size
-- without exceeding either its document-count or total-storage limit.
create or replace function can_upload_document(p_firm_id uuid, p_additional_bytes bigint)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_max_docs int;
  v_max_mb int;
  v_current_docs int;
  v_current_bytes bigint;
begin
  select max_documents, max_storage_mb into v_max_docs, v_max_mb
  from plan_limits where plan = firm_plan(p_firm_id);

  if v_max_docs is not null then
    select count(*) into v_current_docs from documents where firm_id = p_firm_id;
    if v_current_docs >= v_max_docs then
      return false;
    end if;
  end if;

  if v_max_mb is not null then
    select coalesce(sum(size_bytes), 0) into v_current_bytes from documents where firm_id = p_firm_id;
    if (v_current_bytes + coalesce(p_additional_bytes, 0)) > (v_max_mb::bigint * 1024 * 1024) then
      return false;
    end if;
  end if;

  return true;
end;
$$;

-- Split the existing blanket documents policy into granular ones so the
-- storage-quota check applies specifically to INSERT (uploading), the same
-- way 0010 did for invitations — revoking access to an existing document,
-- for instance, should never be blocked by a quota.
drop policy if exists "staff manage documents" on documents;

create policy "staff insert documents" on documents
  for insert with check (
    firm_id = auth_firm_id()
    and auth_is_staff()
    and can_upload_document(firm_id, coalesce(size_bytes, 0))
  );

create policy "staff update documents" on documents
  for update using (firm_id = auth_firm_id() and auth_is_staff());

create policy "staff delete documents" on documents
  for delete using (firm_id = auth_firm_id() and auth_is_staff());

-- "staff select documents" and "client select own documents" already exist
-- from 0002_rls_policies.sql and are untouched by this migration.
