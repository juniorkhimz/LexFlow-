-- Private documents bucket. Objects are stored under a path convention of
-- {firm_id}/{matter_id_or_client_id}/{filename} so policies can check the
-- firm segment cheaply via storage.foldername(name).
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Staff can read/write objects only within their own firm's folder.
create policy "staff read own firm documents"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and auth_is_staff()
    and (storage.foldername(name))[1] = auth_firm_id()::text
  );

create policy "staff upload own firm documents"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and auth_is_staff()
    and (storage.foldername(name))[1] = auth_firm_id()::text
  );

create policy "staff update own firm documents"
  on storage.objects for update
  using (
    bucket_id = 'documents'
    and auth_is_staff()
    and (storage.foldername(name))[1] = auth_firm_id()::text
  );

create policy "staff delete own firm documents"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and auth_is_staff()
    and (storage.foldername(name))[1] = auth_firm_id()::text
  );

-- Client-portal users may only read objects for documents rows that belong
-- to one of their own client_id values (join back through public.documents,
-- matched by storage_path).
create policy "client read own documents"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from documents d
      where d.storage_path = storage.objects.name
        and d.client_id in (select auth_client_ids())
    )
  );

-- No public/anon access exists on this bucket: the app must always fetch
-- files via supabase.storage.from('documents').createSignedUrl(...), never
-- a public getPublicUrl().
