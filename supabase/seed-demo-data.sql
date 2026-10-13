-- Run this AFTER signing up and creating your firm through the app UI.
-- It seeds realistic sample data into YOUR firm so a demo doesn't start
-- from a completely empty dashboard.
--
-- HOW TO RUN:
-- 1. Sign up in the app, create your firm (e.g. name it "Demo Firm").
-- 2. In the Supabase SQL Editor, find your firm's ID:
--      select id, name from firms order by created_at desc limit 5;
-- 3. Replace the firm_id below with that value, then run this whole file.
-- 4. Refresh the app — Dashboard, Leads, Clients, Matters, Quotes,
--    Invoices, Deadlines, Tasks, and Reports will all have realistic data.
--
-- Safe to re-run: uses fixed-looking-but-random UUIDs generated fresh each
-- run, so re-running just adds a second batch rather than erroring — if you
-- want a clean slate first, delete the firm's data manually or start a
-- fresh firm.

do $$
declare
  v_firm_id uuid := 'PASTE-YOUR-FIRM-ID-HERE';  -- <-- change this
  v_admin_id uuid;
  v_pa_corporate uuid;
  v_pa_litigation uuid;
  v_pa_family uuid;
  v_pa_property uuid;
  v_client_1 uuid;
  v_client_2 uuid;
  v_client_3 uuid;
  v_matter_1 uuid;
  v_matter_2 uuid;
  v_quote_1 uuid;
  v_invoice_1 uuid;
  v_invoice_2 uuid;
begin
  if v_firm_id = 'PASTE-YOUR-FIRM-ID-HERE' then
    raise exception 'Edit this script and replace v_firm_id with your actual firm ID first.';
  end if;

  select id into v_admin_id from profiles where firm_id = v_firm_id order by created_at limit 1;
  if v_admin_id is null then
    raise exception 'No profile found for firm %. Sign up and create the firm first.', v_firm_id;
  end if;

  -- Practice areas
  insert into practice_areas (firm_id, name) values
    (v_firm_id, 'Corporate Law'), (v_firm_id, 'Litigation'),
    (v_firm_id, 'Family Law'), (v_firm_id, 'Property Law')
  on conflict (firm_id, name) do nothing;
  select id into v_pa_corporate from practice_areas where firm_id = v_firm_id and name = 'Corporate Law';
  select id into v_pa_litigation from practice_areas where firm_id = v_firm_id and name = 'Litigation';
  select id into v_pa_family from practice_areas where firm_id = v_firm_id and name = 'Family Law';
  select id into v_pa_property from practice_areas where firm_id = v_firm_id and name = 'Property Law';

  -- Leads (mix of pipeline stages)
  insert into leads (firm_id, name, company, email, phone, practice_area_id, status, advocate_id, source, priority, estimated_value, notes) values
    (v_firm_id, 'Grace Wanjiru', 'Savannah Traders Ltd', 'grace.w@savannahtraders.co.ke', '+254712345001', v_pa_corporate, 'new', v_admin_id, 'Referral', 'high', 350000, 'Interested in company incorporation and shareholder agreement drafting.'),
    (v_firm_id, 'Daniel Otieno', null, 'd.otieno@gmail.com', '+254712345002', v_pa_family, 'contacted', v_admin_id, 'Website', 'medium', 80000, 'Divorce and child custody consultation requested.'),
    (v_firm_id, 'Ministry Supplies Co.', 'Ministry Supplies Co.', 'procurement@ministrysupplies.co.ke', '+254712345003', v_pa_litigation, 'qualified', v_admin_id, 'Referral', 'critical', 1200000, 'Contract dispute with a supplier, time-sensitive.'),
    (v_firm_id, 'Amina Hassan', null, 'amina.hassan@outlook.com', '+254712345004', v_pa_property, 'consultation_scheduled', v_admin_id, 'Walk-in', 'medium', 150000, 'Land title dispute, inherited property.'),
    (v_firm_id, 'Peter Kamau', 'Kamau Logistics', 'peter@kamaulogistics.co.ke', '+254712345005', v_pa_corporate, 'quote_sent', v_admin_id, 'Referral', 'high', 420000, 'Fleet lease agreements review.'),
    (v_firm_id, 'Sarah Njeri', null, 'sarah.njeri@yahoo.com', '+254712345006', v_pa_family, 'rejected', v_admin_id, 'Website', 'low', 60000, 'Went with another firm.');

  -- Clients (some standalone, some as if converted from leads)
  insert into clients (firm_id, full_name, organization, email, phone, address, client_type, kyc_status, notes)
  values (v_firm_id, 'Samuel Mwangi', 'Mwangi & Sons Construction', 'samuel@mwangiconstruction.co.ke', '+254722345001', 'Industrial Area, Nairobi', 'company', 'verified', 'Long-standing client, quarterly retainer.')
  returning id into v_client_1;

  insert into clients (firm_id, full_name, organization, email, phone, address, client_type, kyc_status, notes)
  values (v_firm_id, 'Faith Chebet', null, 'faith.chebet@gmail.com', '+254722345002', 'Kilimani, Nairobi', 'individual', 'verified', 'Ongoing employment dispute matter.')
  returning id into v_client_2;

  insert into clients (firm_id, full_name, organization, email, phone, address, client_type, kyc_status, notes)
  values (v_firm_id, 'Coastline Hospitality Group', 'Coastline Hospitality Group', 'legal@coastlinehg.co.ke', '+254722345003', 'Nyali, Mombasa', 'organization', 'pending', 'New client, hospitality licensing matters.')
  returning id into v_client_3;

  -- Matters
  insert into matters (firm_id, matter_number, matter_name, client_id, practice_area_id, advocate_id, status, description, start_date, progress, billed_amount, notes)
  values (v_firm_id, 'M-2026-014', 'Mwangi Construction — Commercial Lease Review', v_client_1, v_pa_corporate, v_admin_id, 'active', 'Reviewing and negotiating commercial lease terms for new warehouse.', current_date - interval '25 days', 60, 180000, 'Landlord counter-proposal expected this week.')
  returning id into v_matter_1;

  insert into matters (firm_id, matter_number, matter_name, client_id, practice_area_id, advocate_id, status, description, start_date, progress, billed_amount, notes)
  values (v_firm_id, 'M-2026-015', 'Chebet v. Former Employer — Wrongful Termination', v_client_2, v_pa_litigation, v_admin_id, 'intake', 'Employment tribunal claim for wrongful termination and unpaid benefits.', current_date - interval '10 days', 20, 45000, 'Awaiting employer response to demand letter.')
  returning id into v_matter_2;

  insert into matters (firm_id, matter_number, matter_name, client_id, practice_area_id, advocate_id, status, description, start_date, progress, billed_amount)
  values (v_firm_id, 'M-2026-016', 'Coastline — Liquor Licensing Renewal', v_client_3, v_pa_property, v_admin_id, 'pending', 'Annual liquor license renewal for two properties.', current_date - interval '3 days', 5, 0);

  -- Tasks
  insert into tasks (firm_id, matter_id, title, description, assigned_to, priority, status, due_date, created_by) values
    (v_firm_id, v_matter_1, 'Draft lease amendment clauses', 'Prepare redlines for landlord counter-proposal.', v_admin_id, 'high', 'in_progress', current_date + 2, v_admin_id),
    (v_firm_id, v_matter_1, 'Schedule site visit', null, v_admin_id, 'medium', 'todo', current_date + 5, v_admin_id),
    (v_firm_id, v_matter_2, 'File tribunal claim', 'Submit formal claim with supporting documents.', v_admin_id, 'critical', 'todo', current_date + 3, v_admin_id),
    (v_firm_id, null, 'Follow up with Ministry Supplies lead', 'Send updated quote after their revision requests.', v_admin_id, 'high', 'todo', current_date + 1, v_admin_id),
    (v_firm_id, v_matter_1, 'Send engagement letter', null, v_admin_id, 'medium', 'completed', current_date - 5, v_admin_id);

  -- Deadlines
  insert into deadlines (firm_id, matter_id, client_id, title, description, owner_id, due_date, priority, status) values
    (v_firm_id, v_matter_2, v_client_2, 'Tribunal filing deadline', 'Statutory deadline to file the wrongful termination claim.', v_admin_id, now() + interval '3 days', 'critical', 'pending'),
    (v_firm_id, v_matter_1, v_client_1, 'Lease counter-proposal response due', null, v_admin_id, now() + interval '6 days', 'high', 'pending'),
    (v_firm_id, null, v_client_3, 'Liquor license renewal deadline', 'County renewal window closes.', v_admin_id, now() + interval '14 days', 'medium', 'pending');

  -- Appointments
  insert into appointments (firm_id, title, client_id, matter_id, advocate_id, appointment_date, start_time, end_time, type, location, status) values
    (v_firm_id, 'Lease negotiation strategy call', v_client_1, v_matter_1, v_admin_id, current_date + 2, '10:00', '11:00', 'call', 'Phone', 'confirmed'),
    (v_firm_id, 'Initial consultation — property dispute', null, null, v_admin_id, current_date + 4, '14:00', '15:00', 'consultation', 'Office', 'scheduled');

  -- Quote (with items — totals auto-compute via triggers)
  insert into quotes (firm_id, quote_number, client_id, matter_id, status, valid_until, notes, created_by)
  values (v_firm_id, 'Q-DEMO-0001', v_client_3, null, 'sent', current_date + 14, 'Liquor licensing renewal — both properties.', v_admin_id)
  returning id into v_quote_1;

  insert into quote_items (quote_id, description, quantity, unit_price, tax_rate, discount, sort_order) values
    (v_quote_1, 'License renewal filing — Property A', 1, 45000, 16, 0, 0),
    (v_quote_1, 'License renewal filing — Property B', 1, 45000, 16, 0, 1),
    (v_quote_1, 'Compliance review & documentation', 1, 25000, 16, 5000, 2);

  -- Invoices (with items and a partial payment — totals/status auto-compute via triggers)
  insert into invoices (firm_id, invoice_number, client_id, matter_id, status, due_date, notes, created_by)
  values (v_firm_id, 'INV-DEMO-0001', v_client_1, v_matter_1, 'sent', current_date + 20, 'Commercial lease review — Phase 1.', v_admin_id)
  returning id into v_invoice_1;

  insert into invoice_items (invoice_id, description, quantity, unit_price, tax_rate, discount, sort_order) values
    (v_invoice_1, 'Lease review & negotiation (hours)', 12, 8500, 16, 0, 0),
    (v_invoice_1, 'Document drafting', 1, 35000, 16, 0, 1);

  insert into invoices (firm_id, invoice_number, client_id, matter_id, status, due_date, notes, created_by)
  values (v_firm_id, 'INV-DEMO-0002', v_client_2, v_matter_2, 'partially_paid', current_date - 5, 'Employment tribunal filing — retainer.', v_admin_id)
  returning id into v_invoice_2;

  insert into invoice_items (invoice_id, description, quantity, unit_price, tax_rate, discount, sort_order) values
    (v_invoice_2, 'Initial retainer — tribunal filing', 1, 45000, 16, 0, 0);

  insert into payments (firm_id, invoice_id, client_id, amount, payment_date, method, reference, recorded_by) values
    (v_firm_id, v_invoice_2, v_client_2, 20000, current_date - 2, 'mpesa', 'QK7X9J2M1P', v_admin_id);

  -- A few activity log entries so the Dashboard's "Recent activity" isn't empty
  insert into activities (firm_id, user_id, action, entity_type, entity_id, metadata) values
    (v_firm_id, v_admin_id, 'matter.created', 'matter', v_matter_1, jsonb_build_object('name', 'Mwangi Construction — Commercial Lease Review')),
    (v_firm_id, v_admin_id, 'invoice.created', 'invoice', v_invoice_1, jsonb_build_object('invoice_number', 'INV-DEMO-0001')),
    (v_firm_id, v_admin_id, 'payment.recorded', 'invoice', v_invoice_2, jsonb_build_object('amount', 20000, 'method', 'mpesa'));

  raise notice 'Demo data seeded successfully for firm %', v_firm_id;
end $$;
